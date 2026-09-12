import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import type Konva from "konva";
import { Button } from "@bluethub/ui-kit";
import {
  Eraser,
  Loader2,
  Pen,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { lessonService, resolveMediaType, type CloudinarySignature } from "@/services/lesson";
import { uploadToCloudinary } from "@/utils/media-upload-helpers";
import type { GroupContentMediaFile } from "@/services/groups";

// ── Types ──────────────────────────────────────────────────────────────────
type Tool = "pen" | "eraser";

interface BoardStroke {
  id: string;
  tool: Tool;
  color: string;
  width: number;
  points: number[];
}

interface BoardPage {
  id: string;
  strokes: BoardStroke[];
}

const COLORS = ["#1a1a1a", "#E8302C", "#2563eb", "#16a34a", "#f97316", "#7c3aed"];
const WIDTHS = [2, 4, 8, 14];
const STAGE_HEIGHT = 380;

interface BoardSnapshotToolProps {
  onSaved: (entries: { file: File; result: GroupContentMediaFile }[]) => void;
  onCancel: () => void;
  startingDisplayOrder: number;
}

/**
 * A student who just wants to solve/write on a board without narrating an
 * explanation (no audio, no stroke-by-stroke recording) — draw across as many
 * boards as needed, then a single "Save" snapshots each one as a PNG and
 * uploads it as a regular image media file, same as an attached photo.
 * Reuses the drawing mechanics from teacher/component/quiz-board.tsx's
 * inline "Add Board Question" tool, extended to multiple boards.
 */
const BoardSnapshotTool = ({ onSaved, onCancel, startingDisplayOrder }: BoardSnapshotToolProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<Map<string, Konva.Stage>>(new Map());
  const [stageWidth, setStageWidth] = useState(600);

  const [pages, setPages] = useState<BoardPage[]>([{ id: crypto.randomUUID(), strokes: [] }]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [activeStroke, setActiveStroke] = useState<BoardStroke | null>(null);
  const isDrawing = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setStageWidth(containerRef.current.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const activePage = pages[activeIndex];

  const getPos = (stage: Konva.Stage) => {
    const pos = stage.getPointerPosition();
    return pos ? [pos.x, pos.y] : null;
  };

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getPos(stage);
    if (!pos) return;
    isDrawing.current = true;
    setActiveStroke({
      id: crypto.randomUUID(),
      tool,
      color: tool === "eraser" ? "#ffffff" : color,
      width: tool === "eraser" ? width * 4 : width,
      points: pos,
    });
  }, [tool, color, width]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing.current || !activeStroke) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getPos(stage);
    if (!pos) return;
    setActiveStroke((prev) => (prev ? { ...prev, points: [...prev.points, ...pos] } : prev));
  }, [activeStroke]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !activeStroke) return;
    isDrawing.current = false;
    if (activeStroke.points.length >= 4) {
      setPages((prev) => prev.map((p, i) =>
        i === activeIndex ? { ...p, strokes: [...p.strokes, activeStroke] } : p
      ));
    }
    setActiveStroke(null);
  }, [activeStroke, activeIndex]);

  const undo = () => {
    setPages((prev) => prev.map((p, i) =>
      i === activeIndex ? { ...p, strokes: p.strokes.slice(0, -1) } : p
    ));
  };

  const clearActiveBoard = () => {
    setPages((prev) => prev.map((p, i) => (i === activeIndex ? { ...p, strokes: [] } : p)));
    setActiveStroke(null);
  };

  const addBoard = () => {
    setPages((prev) => [...prev, { id: crypto.randomUUID(), strokes: [] }]);
    setActiveIndex(pages.length);
  };

  const removeBoard = (index: number) => {
    if (pages.length <= 1) return;
    const removedId = pages[index].id;
    stageRefs.current.delete(removedId);
    setPages((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
  };

  const hasAnyContent = pages.some((p) => p.strokes.length > 0);

  const captureAsBlob = async (stage: Konva.Stage): Promise<Blob> => {
    const dataUrl = stage.toDataURL({ pixelRatio: 1 });
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const handleSaveAll = async () => {
    const nonEmptyPages = pages.filter((p) => p.strokes.length > 0);
    if (nonEmptyPages.length === 0) {
      toast.error("Draw something on at least one board first.");
      return;
    }

    setIsSaving(true);
    setSaveProgress({ current: 0, total: nonEmptyPages.length });
    try {
      let sig: CloudinarySignature | null = null;
      const entries: { file: File; result: GroupContentMediaFile }[] = [];

      for (let i = 0; i < nonEmptyPages.length; i++) {
        const page = nonEmptyPages[i];
        const stage = stageRefs.current.get(page.id);
        if (!stage) continue;

        const blob = await captureAsBlob(stage);
        const file = new File([blob], `board-${i + 1}.png`, { type: "image/png" });

        if (!sig) {
          const r = await lessonService.getUploadSignature(resolveMediaType(file.type) as any);
          sig = (r.data as any).data as CloudinarySignature;
        }

        const res = await uploadToCloudinary(file, sig, () => {});
        const ext = res.format || "png";
        entries.push({
          file,
          result: {
            fileName: `${res.original_filename}.${ext}`,
            originalFileName: `Board ${i + 1}.png`,
            fileExtension: ext,
            cloudinaryUrl: res.secure_url,
            publicId: res.public_id,
            fileSizeBytes: res.bytes,
            displayOrder: startingDisplayOrder + i,
          },
        });
        setSaveProgress({ current: i + 1, total: nonEmptyPages.length });
      }

      toast.success(`${entries.length} board${entries.length === 1 ? "" : "s"} saved`);
      onSaved(entries);
    } catch (err) {
      const e = err as { response?: { data?: { responseMessage?: string } }; message?: string };
      toast.error(e?.response?.data?.responseMessage ?? e?.message ?? "Failed to save boards.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border border-student-chestnut/20 rounded-2xl overflow-hidden bg-white">
      {/* ── Board tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 pt-4 flex-wrap">
        {pages.map((page, i) => (
          <button
            key={page.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              i === activeIndex
                ? "bg-student-chestnut text-white"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            Board {i + 1}
            {page.strokes.length === 0 && <span className="opacity-60">(empty)</span>}
            {pages.length > 1 && (
              <X
                className="w-3 h-3 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); removeBoard(i); }}
              />
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={addBoard}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-student-chestnut hover:bg-student-chestnut/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add board
        </button>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-y border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setTool("pen")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              tool === "pen" ? "bg-student-chestnut text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Pen size={13} /> Pen
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              tool === "eraser" ? "bg-gray-600 text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Eraser size={13} /> Eraser
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setTool("pen"); }}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
              style={{
                backgroundColor: c,
                borderColor: color === c ? "#6366f1" : "#e2e8f0",
                boxShadow: color === c ? "0 0 0 2px #6366f180" : "none",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWidth(w)}
              className={`flex items-center justify-center w-7 h-7 rounded-md border transition-all ${
                width === w ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
              }`}
              title={`Width ${w}px`}
            >
              <div className="rounded-full bg-gray-600" style={{ width: Math.min(w * 1.5, 16), height: Math.min(w * 1.5, 16) }} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={undo}
            disabled={!activePage || activePage.strokes.length === 0}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-30 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-all"
          >
            <RotateCcw size={13} /> Undo
          </button>
          <button
            type="button"
            onClick={clearActiveBoard}
            disabled={!activePage || activePage.strokes.length === 0}
            className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-600 disabled:opacity-30 px-2 py-1.5 rounded-md hover:bg-rose-50 transition-all"
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {/* ── Canvas area — every board's Stage stays mounted (only the
          active one is visible) so Save can snapshot all of them without
          paging through and waiting on re-renders. ─────────────────── */}
      <div ref={containerRef} className="bg-white" style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}>
        {pages.map((page, i) => (
          <div key={page.id} style={{ display: i === activeIndex ? "block" : "none" }}>
            <Stage
              ref={(node) => {
                if (node) stageRefs.current.set(page.id, node);
                else stageRefs.current.delete(page.id);
              }}
              width={stageWidth}
              height={STAGE_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <Layer>
                {page.strokes.map((s) => (
                  <Line
                    key={s.id}
                    points={s.points}
                    stroke={s.color}
                    strokeWidth={s.width}
                    tension={0.4}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={s.tool === "eraser" ? "destination-out" : "source-over"}
                  />
                ))}
                {i === activeIndex && activeStroke && (
                  <Line
                    points={activeStroke.points}
                    stroke={activeStroke.color}
                    strokeWidth={activeStroke.width}
                    tension={0.4}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={activeStroke.tool === "eraser" ? "destination-out" : "source-over"}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        ))}
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/60">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X size={14} /> Cancel
        </button>
        <Button
          onClick={handleSaveAll}
          disabled={isSaving || !hasAnyContent}
          className="flex items-center gap-2 px-5 py-4 rounded-lg bg-student-chestnut hover:bg-student-chestnut/90 disabled:opacity-50 text-white text-sm font-semibold"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Save size={14} className="shrink-0" />}
          {isSaving
            ? `Saving ${saveProgress.current}/${saveProgress.total}…`
            : `Save ${pages.filter((p) => p.strokes.length > 0).length || ""} Board${pages.filter((p) => p.strokes.length > 0).length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
};

export default BoardSnapshotTool;
