import { Button } from "@bluethub/ui-kit";
import { Plus } from "lucide-react";

interface BoardPageNavProps {
  currentBoard: number;
  availableBoards: number[];
  onSwitch: (boardIndex: number) => void;
  onAdd: () => void;
  className?: string;
}

/** The board/page navigator — a horizontally-scrollable row of board chips
 * (`B1 B2 B3…`) plus an "add board" action. Deliberately NOT a prev/next
 * arrow pair: today's switcher can jump directly to any board in
 * `availableBoards`, not just step to an adjacent one, and a strict
 * prev/next UI would change that behavior — this only restyles it. */
export default function BoardPageNav({ currentBoard, availableBoards, onSwitch, onAdd, className }: BoardPageNavProps) {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto ${className ?? ""}`}>
      {availableBoards.map((n) => (
        <button
          key={n}
          onClick={() => onSwitch(n)}
          title={`Switch to board B${n}`}
          aria-label={`Switch to board B${n}`}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none transition-all ${
            currentBoard === n
              ? "bg-chestnut text-white shadow-[0_2px_8px_-2px_rgba(41,35,130,0.5)]"
              : "border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {n >= 10 ? "B" : `B${n}`}
        </button>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={onAdd}
        className="size-9 shrink-0 rounded-full border-dashed p-0 text-slate-500 hover:border-chestnut hover:text-chestnut"
        title="Create new board"
        aria-label="Create new board"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
