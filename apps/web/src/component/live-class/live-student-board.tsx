import { useEffect, useRef, useState } from "react";
import { Button } from "@bluethub/ui-kit";
import { Trash2 } from "lucide-react";
import BoardCanvas, { type BoardCanvasHandle } from "./board-canvas";
import BoardToolRail from "./board/board-tool-rail";
import BoardPageNav from "./board/board-page-nav";
import { BoardPropertiesPanel, BoardPropertiesTrigger } from "./board/board-properties-panel";
import { useLiveBoardStrokes } from "@/hooks/useLiveBoardStrokes";
import type { LiveBoardHubClient, HubStroke } from "@/services/live-board-hub";

const PALETTE = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const WIDTHS = [2, 4, 8];
/** Fixed, deliberately outside `PALETTE` so a teacher's annotation on a
 * student's board can never collide with a color the student themself
 * could pick — the two authors stay visually distinguishable on the same
 * board without needing to tag/transmit an explicit author field per stroke. */
const TEACHER_INK_COLOR = "#f97316";

interface LiveStudentBoardProps {
  hub: LiveBoardHubClient;
  studentId: string;
  /** True if the local user may draw here — the student on their own board,
   * or the teacher currently focused on this student's board. */
  canDraw: boolean;
  /** True when the local user IS this student — routes draws through
   * SendMyStroke/ClearMyBoard/SwitchMyBoard instead of the teacher-on-a-
   * student's-board variants, and shows the page switcher (only the board's
   * own owner can change which page is open — the hub has no remote-switch
   * call for a teacher to flip a student's page for them). */
  isOwnBoard: boolean;
  /** Seeds the board without an extra round-trip — pass `join.myBoard` here
   * for a student's own board at mount. Omit it for the teacher's view; this
   * component fetches the student's board itself via GetStudentBoard. */
  initialSnapshot?: { strokes: HubStroke[]; currentBoard: number } | null;
  viewOnlyLabel?: string;
  className?: string;
}

/**
 * One student's private board. Used three ways: a student drawing on their
 * own board, a teacher drawing on a chosen student's board, and a read-only
 * view (e.g. the board currently "shared to class"). Self-contained like
 * `LiveBoard`. Callers should mount one instance per student for the whole
 * class and just toggle visibility/`canDraw` — unmounting on every focus
 * change throws away the live stroke cache and forces a refetch, which reads
 * to the user as the board losing everything.
 */
export default function LiveStudentBoard({
  hub,
  studentId,
  canDraw,
  isOwnBoard,
  initialSnapshot,
  viewOnlyLabel,
  className,
}: LiveStudentBoardProps) {
  const board = useLiveBoardStrokes(initialSnapshot?.currentBoard ?? 1);
  const canvasRef = useRef<BoardCanvasHandle | null>(null);
  // Teacher annotating a student's board always draws in the fixed teacher
  // ink color (no picker, no risk of matching whatever the student used on
  // their own board) — the student's own board keeps the full palette.
  const [color, setColor] = useState(isOwnBoard ? PALETTE[0] : TEACHER_INK_COLOR);
  const [width, setWidth] = useState(WIDTHS[0]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  // The authoritative board number only becomes known once GetStudentBoard
  // resolves (or `initialSnapshot` is handed in). Drawing before that would
  // stamp strokes with whatever `currentBoard` defaulted to (1), which can
  // silently diverge from the student's real current board and land the
  // stroke in a bucket nobody's looking at. Gate actual drawing on it.
  const [loaded, setLoaded] = useState(!!initialSnapshot);

  useEffect(() => {
    if (initialSnapshot) {
      board.loadSnapshot(initialSnapshot.strokes, initialSnapshot.currentBoard);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    void hub.getStudentBoard(studentId).then((data) => {
      if (cancelled) return;
      if (data) board.loadSnapshot(data.strokes, data.currentBoard);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // Re-fetch whenever the focused student changes (teacher switching focus).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub, studentId]);

  useEffect(() => {
    const unsubStroke = hub.on("StudentStroke", ({ studentId: sid, stroke }) => {
      if (sid === studentId) board.addStroke(stroke);
    });
    const unsubRemoved = hub.on("StudentStrokeRemoved", ({ studentId: sid, strokeId }) => {
      if (sid === studentId) board.removeStroke(strokeId);
    });
    const unsubCleared = hub.on("StudentBoardCleared", ({ studentId: sid, board: boardIndex }) => {
      if (sid === studentId) board.clearBoard(boardIndex);
    });
    const unsubChanged = hub.on("StudentBoardChanged", ({ studentId: sid, board: boardIndex }) => {
      if (sid === studentId) board.switchBoard(boardIndex);
    });

    return () => {
      unsubStroke();
      unsubRemoved();
      unsubCleared();
      unsubChanged();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub, studentId]);

  const sendStroke = (stroke: HubStroke) =>
    isOwnBoard ? hub.sendMyStroke(stroke) : hub.sendStudentBoardStroke(studentId, stroke);
  const removeStroke = (id: string) =>
    isOwnBoard ? hub.removeMyStroke(id) : hub.removeStudentBoardStroke(studentId, id);
  const clear = () => (isOwnBoard ? hub.clearMyBoard() : hub.clearStudentBoard(studentId));

  const handleUndo = () => canvasRef.current?.undoLastStroke();
  const handleClear = () => {
    board.clearBoard();
    void clear();
  };
  const handleSwitchBoard = (boardIndex: number) => {
    board.switchBoard(boardIndex);
    void hub.switchMyBoard(boardIndex);
  };
  const handleAddBoard = () => {
    const next = board.addBoard();
    void hub.switchMyBoard(next);
  };

  return (
    <div className={`flex h-full flex-col gap-2 ${className ?? ""}`}>
      {canDraw && (
        <div className={`flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)] ${isOwnBoard ? "justify-between" : "justify-end"}`}>
          {isOwnBoard && (
            <BoardPageNav
              currentBoard={board.currentBoard}
              availableBoards={board.availableBoards}
              onSwitch={handleSwitchBoard}
              onAdd={handleAddBoard}
            />
          )}
          <div className="flex shrink-0 items-center gap-2">
            <BoardPropertiesTrigger
              tool={tool}
              width={width}
              onWidthChange={setWidth}
              widths={WIDTHS}
              eraserWidth={30}
              colorMode={isOwnBoard ? "palette" : "fixed"}
              color={color}
              onColorChange={setColor}
              palette={PALETTE}
              fixedColor={TEACHER_INK_COLOR}
              fixedColorLabel="Teacher's ink"
            />
            <Button size="sm" variant="outline" onClick={handleClear} title="Clear this board">
              <Trash2 className="size-4" />
            </Button>
          </div>
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
            canDraw={canDraw && loaded}
            color={color}
            width={width}
            tool={tool}
            currentBoard={board.currentBoard}
            onSegment={(segment) => {
              board.addStroke(segment); // optimistic local echo — no server echo for the author
              void sendStroke(segment);
            }}
            onUndoSegments={(ids) => {
              board.removeStrokes(ids);
              ids.forEach((id) => void removeStroke(id));
            }}
            viewOnlyLabel={canDraw && !loaded ? "Loading board…" : viewOnlyLabel}
          />
        </div>
        {canDraw && (
          <BoardPropertiesPanel
            tool={tool}
            width={width}
            onWidthChange={setWidth}
            widths={WIDTHS}
            eraserWidth={30}
            colorMode={isOwnBoard ? "palette" : "fixed"}
            color={color}
            onColorChange={setColor}
            palette={PALETTE}
            fixedColor={TEACHER_INK_COLOR}
            fixedColorLabel="Teacher's ink"
          />
        )}
      </div>
    </div>
  );
}
