import { Stage, Layer, Line } from "react-konva";
import { useCallback, useImperativeHandle, useRef, useState, forwardRef } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Position } from "@/utils/constant";
import { useResponsiveStage } from "@/hooks/useResponsiveStage";
import { StrokeSegmenter, type StrokeSegment } from "@/utils/stroke-segmentation";
import type { HubStroke } from "@/services/live-board-hub";
import { Eye } from "lucide-react";

// Finger-drawing zoom, same bounds/behaviour as the recorder's note-board —
// strokes always stay in logical (unzoomed) board coordinates.
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export interface BoardCanvasHandle {
  /** Removes the local user's most recently completed stroke (all of its
   * live-transport segments) and reports the removed ids via `onUndoSegments`. */
  undoLastStroke: () => void;
}

interface BoardCanvasProps {
  strokes: HubStroke[];
  canDraw: boolean;
  color: string;
  width: number;
  currentBoard: number;
  /** Fired as the in-progress stroke is segmented for live transport. */
  onSegment: (segment: StrokeSegment) => void;
  /** Fired once with every segment id belonging to a stroke that's being undone. */
  onUndoSegments: (segmentIds: string[]) => void;
  viewOnlyLabel?: string;
  minWidth?: number;
  minHeight?: number;
}

const toPoints = (pts: [number, number][]): number[] => pts.flat();

const BoardCanvas = forwardRef<BoardCanvasHandle, BoardCanvasProps>(function BoardCanvas(
  {
    strokes,
    canDraw,
    color,
    width,
    currentBoard,
    onSegment,
    onUndoSegments,
    viewOnlyLabel,
    minWidth = 320,
    minHeight = 240,
  },
  ref
) {
  const { parentRef, dimensions } = useResponsiveStage(minWidth, minHeight);
  const boardW = dimensions.width;
  const boardH = dimensions.height;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; center: Position } | null>(null);

  const activePointsRef = useRef<number[]>([]);
  const activeLineRef = useRef<Konva.Line | null>(null);
  const segmenterRef = useRef<StrokeSegmenter | null>(null);
  const ownStrokeHistory = useRef<string[][]>([]);

  const clampPan = useCallback(
    (p: Position, z: number): Position => ({
      x: Math.min(0, Math.max(boardW - boardW * z, p.x)),
      y: Math.min(0, Math.max(boardH - boardH * z, p.y)),
    }),
    [boardW, boardH]
  );

  const applyZoom = useCallback(
    (center: Position, nextZoomRaw: number) => {
      setZoom((prevZoom) => {
        const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoomRaw));
        setPan((prevPan) => {
          if (nextZoom === MIN_ZOOM) return { x: 0, y: 0 };
          const worldX = (center.x - prevPan.x) / prevZoom;
          const worldY = (center.y - prevPan.y) / prevZoom;
          return clampPan({ x: center.x - worldX * nextZoom, y: center.y - worldY * nextZoom }, nextZoom);
        });
        return nextZoom;
      });
    },
    [clampPan]
  );

  const toLogical = useCallback(
    (pos: Position): Position => ({ x: (pos.x - pan.x) / zoom, y: (pos.y - pan.y) / zoom }),
    [pan, zoom]
  );

  const touchDistance = (touches: TouchList): number => {
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const touchCenter = (touches: TouchList, stage: Konva.Stage): Position => {
    const rect = stage.container().getBoundingClientRect();
    const a = touches[0];
    const b = touches[1];
    return { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top };
  };

  const startDrawing = useCallback(
    (pos: Position) => {
      activePointsRef.current = [pos.x, pos.y];
      activeLineRef.current?.points(activePointsRef.current);
      activeLineRef.current?.getLayer()?.batchDraw();

      const penId = crypto.randomUUID();
      segmenterRef.current = new StrokeSegmenter({
        penId,
        color,
        width,
        currentBoard,
        onSegment: (segment) => onSegment(segment),
      });
      segmenterRef.current.addPoint(pos.x, pos.y);
    },
    [color, width, currentBoard, onSegment]
  );

  const updateDrawing = useCallback((pos: Position) => {
    activePointsRef.current.push(pos.x, pos.y);
    activeLineRef.current?.points(activePointsRef.current);
    activeLineRef.current?.getLayer()?.batchDraw();
    segmenterRef.current?.addPoint(pos.x, pos.y);
  }, []);

  const finishDrawing = useCallback(() => {
    activePointsRef.current = [];
    activeLineRef.current?.points([]);
    activeLineRef.current?.getLayer()?.batchDraw();

    const segmenter = segmenterRef.current;
    segmenterRef.current = null;
    if (!segmenter) return;
    const ids = segmenter.finish();
    if (ids.length > 0) ownStrokeHistory.current.push(ids);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      undoLastStroke: () => {
        const ids = ownStrokeHistory.current.pop();
        if (ids && ids.length > 0) onUndoSegments(ids);
      },
    }),
    [onUndoSegments]
  );

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!canDraw) return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) startDrawing(toLogical(pos));
    },
    [canDraw, startDrawing, toLogical]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!canDraw || !segmenterRef.current) return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) updateDrawing(toLogical(pos));
    },
    [canDraw, updateDrawing, toLogical]
  );

  const handleMouseUp = useCallback(() => {
    if (segmenterRef.current) finishDrawing();
  }, [finishDrawing]);

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      applyZoom(pos, zoom - e.evt.deltaY * 0.001);
    },
    [applyZoom, zoom]
  );

  const handleTouchStart = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      if (e.evt.touches.length === 2) {
        pinchRef.current = { dist: touchDistance(e.evt.touches), center: touchCenter(e.evt.touches, stage) };
        if (segmenterRef.current) finishDrawing();
        return;
      }
      if (!canDraw) return;
      const pos = stage.getPointerPosition();
      if (pos) startDrawing(toLogical(pos));
    },
    [canDraw, startDrawing, toLogical, finishDrawing]
  );

  const handleTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      if (e.evt.touches.length === 2 && pinchRef.current) {
        const dist = touchDistance(e.evt.touches);
        const center = touchCenter(e.evt.touches, stage);
        applyZoom(center, zoom * (dist / pinchRef.current.dist));
        pinchRef.current = { dist, center };
        return;
      }
      if (!canDraw || !segmenterRef.current) return;
      const pos = stage.getPointerPosition();
      if (pos) updateDrawing(toLogical(pos));
    },
    [canDraw, updateDrawing, toLogical, applyZoom, zoom]
  );

  const handleTouchEnd = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      pinchRef.current = null;
      if (e.evt.touches.length === 0 && segmenterRef.current) finishDrawing();
    },
    [finishDrawing]
  );

  return (
    <div ref={parentRef} className="relative h-full w-full overflow-hidden rounded-xl bg-white">
      {viewOnlyLabel && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Eye className="size-3.5" />
          {viewOnlyLabel}
        </div>
      )}
      <Stage
        width={boardW}
        height={boardH}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        style={{ cursor: canDraw ? "crosshair" : "default", touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Layer>
          {strokes.map((stroke) => (
            <Line
              key={stroke.id}
              points={toPoints(stroke.pts)}
              stroke={stroke.c}
              strokeWidth={stroke.w}
              lineCap="round"
              lineJoin="round"
              tension={0.4}
              listening={false}
            />
          ))}
        </Layer>
        <Layer listening={false}>
          <Line ref={activeLineRef} points={[]} stroke={color} strokeWidth={width} lineCap="round" lineJoin="round" tension={0.4} />
        </Layer>
      </Stage>
    </div>
  );
});

export default BoardCanvas;
