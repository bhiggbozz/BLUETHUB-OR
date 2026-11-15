import { Button, Popover, PopoverContent, PopoverTrigger } from "@bluethub/ui-kit";
import { Hand, X } from "lucide-react";
import type { HandQueueEntry } from "@/services/live-board-hub";
import BoardSectionLabel from "./board/board-section-label";

/** Small numbered circle — "1" for whoever raised first, "2" for the next,
 * etc. Position in the queue array, not a permanent ticket number, so it
 * stays Teams-like: if #1 lowers their hand, #2 becomes #1. */
export const HandOrderBadge = ({ order }: { order: number }) => (
  <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
    {order}
  </span>
);

/** Student-only toggle — raises/lowers their own hand. Shows their current
 * queue position once raised, same number the teacher/other students see. */
export const RaiseHandButton = ({
  raised,
  order,
  onToggle,
}: {
  raised: boolean;
  order: number | null;
  onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      raised ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:bg-slate-100"
    }`}
    title={raised ? "Lower your hand" : "Raise your hand"}
  >
    <Hand className="size-3.5" />
    {raised ? (order ? `Raised · #${order}` : "Raised") : "Raise hand"}
  </button>
);

/**
 * The full ordered queue, visible to everyone — teacher and students alike —
 * as a compact bell-style popover so it doesn't eat permanent top-bar space.
 * Teacher can lower anyone's hand (e.g. after calling on them); a student
 * can only lower their own.
 */
export const RaisedHandsPanel = ({
  queue,
  selfId,
  isTeacher,
  onLowerSelf,
  onLowerStudent,
}: {
  queue: HandQueueEntry[];
  selfId?: string;
  isTeacher: boolean;
  onLowerSelf?: () => void;
  onLowerStudent?: (studentId: string) => void;
}) => {
  if (queue.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        >
          <Hand className="size-3.5" />
          {queue.length}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <BoardSectionLabel className="px-1.5 pb-1.5">Raised hands</BoardSectionLabel>
        <div className="space-y-1">
          {queue.map((entry, i) => (
            <div
              key={entry.studentId}
              className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-slate-50"
            >
              <HandOrderBadge order={i + 1} />
              <span className="min-w-0 flex-1 truncate text-slate-700">{entry.studentName}</span>
              {isTeacher && onLowerStudent && (
                <button
                  onClick={() => onLowerStudent(entry.studentId)}
                  className="text-slate-400 hover:text-slate-600"
                  title="Lower this student's hand"
                >
                  <X className="size-3.5" />
                </button>
              )}
              {!isTeacher && entry.studentId === selfId && onLowerSelf && (
                <button onClick={onLowerSelf} className="text-xs font-medium text-amber-700 hover:underline">
                  Lower
                </button>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
