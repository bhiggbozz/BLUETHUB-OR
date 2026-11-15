import { useEffect, useRef, useState } from "react";
import { Button } from "@bluethub/ui-kit";
import { Trash2, Loader2 } from "lucide-react";
import BoardCanvas, { type BoardCanvasHandle } from "./board-canvas";
import BoardToolRail from "./board/board-tool-rail";
import BoardPageNav from "./board/board-page-nav";
import { BoardPropertiesPanel, BoardPropertiesTrigger } from "./board/board-properties-panel";
import { useLiveBoardStrokes } from "@/hooks/useLiveBoardStrokes";
import type { LiveBoardHubClient, BoardSnapshot } from "@/services/live-board-hub";
import type { StrokeSegment } from "@/utils/stroke-segmentation";
import {
  encodeBoardMessage,
  decodeBoardMessage,
  strokeSegmentToWireMessage,
  wireStrokeToHubStroke,
  BoardPlayoutScheduler,
  BOARD_PLAYOUT_DELAY_MS,
} from "@/utils/live-board-data-channel";

const PALETTE = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const WIDTHS = [2, 4, 8];

/** The main-board data-channel surface `LiveBoard` needs — structurally
 * satisfied by `useLiveClassAudio()`'s return value, passed straight
 * through by the room components. This is the board's actual live-sync
 * path now: the teacher dual-writes every stroke here and to the hub (the
 * hub write only keeps the snapshot current for late joiners/reconnects),
 * and viewers render exclusively from it. */
export interface BoardDataChannel {
  sendBoardData: (bytes: Uint8Array) => void;
  onBoardData: (handler: (payload: Uint8Array, senderId: string) => void) => () => void;
  onReconnected: (handler: () => void) => () => void;
}

interface LiveBoardProps {
  hub: LiveBoardHubClient;
  /** True only for the teacher — everyone else (students) is view-only. */
  canDraw: boolean;
  /** The snapshot `hub.connect()` resolved with — seeds the board before any
   * live events arrive. Pass whichever snapshot is relevant to the shared
   * board: the top-level `BoardSnapshot` itself. */
  initialSnapshot?: BoardSnapshot | null;
  className?: string;
  /** Optional hooks for an isolated, separate recorder (see
   * `useLiveClassRecorder`) to observe the teacher's own strokes/board
   * switches — this component has no idea a recording exists, it just
   * reports what it already knows about its own local draws. */
  onLocalSegment?: (segment: StrokeSegment) => void;
  onLocalBoardSwitch?: (fromBoard: number, toBoard: number) => void;
  /** LiveKit data-channel surface (see `BoardDataChannel`). */
  dataChannel: BoardDataChannel;
  /** The teacher's LiveKit participant identity — viewers only trust
   * data-channel board messages from this sender. LiveKit doesn't enforce
   * that on its own, so this check *is* the security rule. */
  teacherId: string;
  /** Epoch ms the class started (`liveClass.startedAt`) — the shared zero
   * point every stroke's `ts` is measured from. */
  startedAtMs: number;
  /** `(server time) - (local Date.now())` at join — corrects the local
   * clock to the server's for stamping outgoing strokes. */
  serverOffsetMs: number;
}

/**
 * The one shared "teacher board" every participant sees. Self-contained: it
 * owns its own stroke cache and (when `canDraw`) renders a small pen toolbar
 * + board switcher. Drop it in once per role — `<LiveBoard hub={hub}
 * canDraw={isTeacher} .../>`.
 *
 * Sync is hybrid: the teacher's strokes travel on the LiveKit data channel
 * (same connection as the audio, so pen and voice drift less) and are also
 * sent to the hub so the snapshot stays current. Viewers render only from
 * the data channel for the main board — the hub's live `Stroke`/
 * `StrokeRemoved`/`BoardCleared`/`BoardChanged` events are intentionally
 * never subscribed to here, only `onSnapshot` (join + reconnect repair).
 */
export default function LiveBoard({
  hub,
  canDraw,
  initialSnapshot,
  className,
  onLocalSegment,
  onLocalBoardSwitch,
  dataChannel,
  teacherId,
  startedAtMs,
  serverOffsetMs,
}: LiveBoardProps) {
  const board = useLiveBoardStrokes(initialSnapshot?.currentBoard ?? 1);
  const canvasRef = useRef<BoardCanvasHandle | null>(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [width, setWidth] = useState(WIDTHS[0]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [isLagging, setIsLagging] = useState(false);
  const schedulerRef = useRef<BoardPlayoutScheduler>(new BoardPlayoutScheduler());
  const lagClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flagLagging = () => {
    setIsLagging(true);
    if (lagClearTimerRef.current) clearTimeout(lagClearTimerRef.current);
    lagClearTimerRef.current = setTimeout(() => setIsLagging(false), 3000);
  };

  useEffect(() => {
    const scheduler = schedulerRef.current;
    return () => scheduler.dispose();
  }, []);

  useEffect(() => {
    if (initialSnapshot) {
      board.loadSnapshot(initialSnapshot.strokes, initialSnapshot.currentBoard, initialSnapshot.boards);
      schedulerRef.current.reset(initialSnapshot.strokes.map((s) => s.id));
    }
    // Only ever applies the snapshot handed in at mount — later snapshots
    // arrive via hub.onSnapshot() (rejoin-after-reconnect) below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The hub remains the source of truth for the snapshot (join + reconnect
  // repair) for both roles, but no longer for the main board's live strokes
  // — those travel over the data channel instead (see the effect below).
  useEffect(() => {
    const unsubSnapshot = hub.onSnapshot((snapshot) => {
      board.loadSnapshot(snapshot.strokes, snapshot.currentBoard, snapshot.boards);
      schedulerRef.current.reset(snapshot.strokes.map((s) => s.id));
    });
    return unsubSnapshot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub]);

  // Viewer path only: render the main board exclusively from the teacher's
  // data-channel messages, scheduled at startedAtMs + ts + D so drawing
  // roughly lines up with the voice describing it.
  useEffect(() => {
    if (canDraw) return;

    const unsubData = dataChannel.onBoardData((payload, senderId) => {
      if (senderId !== teacherId) return; // the actual security rule — LiveKit doesn't enforce this
      const msg = decodeBoardMessage(payload);
      if (!msg) return;

      switch (msg.t) {
        case "stroke": {
          const targetTime = startedAtMs + msg.ts + BOARD_PLAYOUT_DELAY_MS;
          schedulerRef.current.schedule(
            msg.id,
            targetTime,
            () => board.addStroke(wireStrokeToHubStroke(msg)),
            flagLagging
          );
          break;
        }
        case "remove":
          board.removeStroke(msg.id);
          break;
        case "clear":
          board.clearBoard(msg.b);
          break;
        case "switch":
          board.switchBoard(msg.b);
          break;
      }
    });

    // The data channel may have missed messages while LiveKit was
    // reconnecting even though the hub stayed up — force a fresh snapshot.
    const unsubReconnected = dataChannel.onReconnected(() => void hub.resync());

    return () => {
      unsubData();
      unsubReconnected();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDraw, dataChannel.onBoardData, dataChannel.onReconnected, hub, teacherId, startedAtMs]);

  const handleSwitchBoard = (boardIndex: number) => {
    onLocalBoardSwitch?.(board.currentBoard, boardIndex);
    board.switchBoard(boardIndex);
    void hub.switchBoard(boardIndex);
    dataChannel.sendBoardData(encodeBoardMessage({ t: "switch", b: boardIndex }));
  };

  const handleAddBoard = () => {
    const from = board.currentBoard;
    const next = board.addBoard();
    onLocalBoardSwitch?.(from, next);
    void hub.switchBoard(next);
    dataChannel.sendBoardData(encodeBoardMessage({ t: "switch", b: next }));
  };

  const handleUndo = () => canvasRef.current?.undoLastStroke();

  const handleClear = () => {
    board.clearBoard();
    void hub.clearBoard();
    dataChannel.sendBoardData(encodeBoardMessage({ t: "clear", b: board.currentBoard }));
  };

  return (
    <div className={`flex h-full flex-col gap-2 ${className ?? ""}`}>
      {canDraw && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)]">
          <BoardPageNav
            currentBoard={board.currentBoard}
            availableBoards={board.availableBoards}
            onSwitch={handleSwitchBoard}
            onAdd={handleAddBoard}
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
      )}

      {!canDraw && isLagging && (
        <div className="flex items-center gap-1.5 self-start rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <Loader2 className="size-3.5 animate-spin" /> Connection slow — catching up…
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        {canDraw && (
          <BoardToolRail tool={tool} onToolChange={setTool} onUndo={handleUndo} className="order-2 md:order-none" />
        )}
        <div className="order-1 min-h-0 flex-1 md:order-none">
          <BoardCanvas
            ref={canvasRef}
            strokes={board.strokes}
            canDraw={canDraw}
            color={color}
            width={width}
            tool={tool}
            currentBoard={board.currentBoard}
            onSegment={(segment) => {
              board.addStroke(segment); // optimistic local echo — the author never gets one from the hub
              void hub.sendStroke(segment); // keeps the hub snapshot current for late joiners/reconnects
              dataChannel.sendBoardData(
                encodeBoardMessage(strokeSegmentToWireMessage(segment, serverOffsetMs, startedAtMs))
              ); // the actual live-sync path, riding the same connection as the audio
              onLocalSegment?.(segment);
            }}
            onUndoSegments={(ids) => {
              board.removeStrokes(ids);
              ids.forEach((id) => {
                void hub.removeStroke(id);
                dataChannel.sendBoardData(encodeBoardMessage({ t: "remove", id }));
              });
            }}
            viewOnlyLabel={canDraw ? undefined : `Teacher's board · B${board.currentBoard}`}
          />
        </div>
        {canDraw && (
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
        )}
      </div>
    </div>
  );
}
