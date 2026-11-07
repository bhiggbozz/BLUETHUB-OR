import { useEffect, useRef, useState } from "react";
import { Button } from "@bluethub/ui-kit";
import { Plus, Undo2, Trash2 } from "lucide-react";
import BoardCanvas, { type BoardCanvasHandle } from "./board-canvas";
import { useLiveBoardStrokes } from "@/hooks/useLiveBoardStrokes";
import type { LiveBoardHubClient, HubStroke } from "@/services/live-board-hub";

const PALETTE = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const WIDTHS = [2, 4, 8];

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
 * `LiveBoard` — mount one per focused student, not one per student at once.
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
  const [color, setColor] = useState(PALETTE[0]);
  const [width, setWidth] = useState(WIDTHS[0]);

  useEffect(() => {
    if (initialSnapshot) {
      board.loadSnapshot(initialSnapshot.strokes, initialSnapshot.currentBoard);
      return;
    }
    let cancelled = false;
    void hub.getStudentBoard(studentId).then((data) => {
      if (!cancelled && data) board.loadSnapshot(data.strokes, data.currentBoard);
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
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/90 px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Use colour ${c}`}
                className={`size-7 rounded-full border-2 transition-transform ${
                  color === c ? "scale-110 border-slate-800" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                aria-label={`Use pen width ${w}`}
                className={`flex size-7 items-center justify-center rounded-full border transition-colors ${
                  width === w ? "border-slate-800 bg-slate-100" : "border-transparent hover:bg-slate-50"
                }`}
              >
                <span className="rounded-full bg-slate-800" style={{ width: w + 2, height: w + 2 }} />
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={handleUndo} title="Undo your last stroke">
              <Undo2 className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear} title="Clear this board">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <BoardCanvas
          ref={canvasRef}
          strokes={board.strokes}
          canDraw={canDraw}
          color={color}
          width={width}
          currentBoard={board.currentBoard}
          onSegment={(segment) => {
            board.addStroke(segment); // optimistic local echo — no server echo for the author
            void sendStroke(segment);
          }}
          onUndoSegments={(ids) => {
            board.removeStrokes(ids);
            ids.forEach((id) => void removeStroke(id));
          }}
          viewOnlyLabel={viewOnlyLabel}
        />
      </div>

      {isOwnBoard && canDraw && (
        <div className="flex flex-wrap items-center gap-2">
          {board.availableBoards.map((n) => (
            <button
              key={n}
              onClick={() => handleSwitchBoard(n)}
              className={`flex size-8 items-center justify-center rounded-full text-[11px] font-semibold leading-none text-white transition-colors ${
                board.currentBoard === n ? "bg-green-600 hover:bg-green-700" : "bg-slate-500 hover:bg-slate-600"
              }`}
              title={`Switch to board B${n}`}
            >
              {n >= 10 ? "B" : `B${n}`}
            </button>
          ))}
          <Button size="sm" variant="outline" onClick={handleAddBoard} className="size-8 rounded-full p-0" title="New board">
            <Plus className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
