import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import BoardCanvas, { type BoardCanvasHandle } from "@/component/live-class/board-canvas";
import BoardToolRail from "@/component/live-class/board/board-tool-rail";
import BoardPageNav from "@/component/live-class/board/board-page-nav";
import { BoardPropertiesPanel, BoardPropertiesTrigger } from "@/component/live-class/board/board-properties-panel";
import type { HubStroke } from "@/services/live-board-hub";

const PALETTE = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const WIDTHS = [2, 4, 8];

/** Dev-only sandbox for the board's visuals — no hub connection, no LiveKit,
 * no scheduled class required. Pure local state, so drawing/undo/clear/
 * board-switching all work instantly for visual review/iteration. Not
 * wired for real sync; don't use this to test multi-participant behavior. */
export default function BoardPreview() {
  const canvasRef = useRef<BoardCanvasHandle | null>(null);
  const [strokesByBoard, setStrokesByBoard] = useState<Record<number, HubStroke[]>>({ 1: [] });
  const [currentBoard, setCurrentBoard] = useState(1);
  const [availableBoards, setAvailableBoards] = useState([1]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(PALETTE[0]);
  const [width, setWidth] = useState(WIDTHS[0]);

  const strokes = strokesByBoard[currentBoard] ?? [];

  const handleAdd = () => {
    const next = Math.max(...availableBoards) + 1;
    setAvailableBoards((prev) => [...prev, next]);
    setStrokesByBoard((prev) => ({ ...prev, [next]: [] }));
    setCurrentBoard(next);
  };

  const handleUndo = () => canvasRef.current?.undoLastStroke();

  const handleClear = () => setStrokesByBoard((prev) => ({ ...prev, [currentBoard]: [] }));

  return (
    <div className="flex h-dvh flex-col gap-2 bg-slate-100 p-3 font-poppins">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)]">
        <BoardPageNav
          currentBoard={currentBoard}
          availableBoards={availableBoards}
          onSwitch={setCurrentBoard}
          onAdd={handleAdd}
        />
        <div className="flex shrink-0 items-center gap-2">
          <BoardPropertiesTrigger
            tool={tool}
            width={width}
            onWidthChange={setWidth}
            widths={WIDTHS}
            eraserWidth={30}
            colorMode="palette"
            color={color}
            onColorChange={setColor}
            palette={PALETTE}
          />
          <Button size="sm" variant="outline" onClick={handleClear} title="Clear this board">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <BoardToolRail tool={tool} onToolChange={setTool} onUndo={handleUndo} className="order-2 md:order-none" />
        <div className="order-1 min-h-0 flex-1 md:order-none">
          <BoardCanvas
            ref={canvasRef}
            strokes={strokes}
            canDraw
            color={color}
            width={width}
            tool={tool}
            currentBoard={currentBoard}
            onSegment={(segment) =>
              setStrokesByBoard((prev) => ({
                ...prev,
                [currentBoard]: [...(prev[currentBoard] ?? []), segment],
              }))
            }
            onUndoSegments={(ids) =>
              setStrokesByBoard((prev) => ({
                ...prev,
                [currentBoard]: (prev[currentBoard] ?? []).filter((s) => !ids.includes(s.id)),
              }))
            }
          />
        </div>
        <BoardPropertiesPanel
          tool={tool}
          width={width}
          onWidthChange={setWidth}
          widths={WIDTHS}
          eraserWidth={30}
          colorMode="palette"
          color={color}
          onColorChange={setColor}
          palette={PALETTE}
        />
      </div>
    </div>
  );
}
