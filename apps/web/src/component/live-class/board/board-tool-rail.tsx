import { Pencil, Eraser, Undo2 } from "lucide-react";

interface BoardToolRailProps {
  tool: "pen" | "eraser";
  onToolChange: (tool: "pen" | "eraser") => void;
  onUndo: () => void;
  className?: string;
}

/** The board's tool rail — Pen/Eraser/Undo as stacked icon-over-label
 * buttons. A left-hand rail on desktop, a horizontally-scrollable bar below
 * the canvas on narrow screens — plain Tailwind responsive classes only, no
 * breakpoint JS (matches `useResponsiveStage`, which has none either).
 * `md:self-start` keeps it sized to its own content instead of stretching
 * to match the canvas's full height, which otherwise reads as a half-empty
 * card with nothing in the bottom two-thirds of it. */
export default function BoardToolRail({ tool, onToolChange, onUndo, className }: BoardToolRailProps) {
  const toolButton = (value: "pen" | "eraser", label: string, Icon: typeof Pencil) => (
    <button
      onClick={() => onToolChange(value)}
      title={label}
      aria-label={label}
      className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2.5 text-[11px] font-medium transition-all md:shrink ${
        tool === value
          ? "bg-chestnut text-white shadow-[0_2px_8px_-2px_rgba(41,35,130,0.5)]"
          : "text-slate-600 hover:bg-slate-100 active:scale-95"
      }`}
    >
      <Icon className="size-[18px]" />
      {label}
    </button>
  );

  return (
    <div
      className={`flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)] md:w-[72px] md:flex-col md:items-stretch md:gap-1.5 md:self-start md:overflow-visible ${className ?? ""}`}
    >
      <button
        onClick={onUndo}
        title="Undo your last stroke"
        aria-label="Undo your last stroke"
        className="flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2.5 text-[11px] font-medium text-slate-600 transition-all hover:bg-slate-100 active:scale-95 md:shrink"
      >
        <Undo2 className="size-[18px]" />
        Undo
      </button>
      <div className="w-px shrink-0 self-stretch bg-slate-100 md:h-px md:w-full md:self-auto" />
      {toolButton("pen", "Pen", Pencil)}
      {toolButton("eraser", "Eraser", Eraser)}
    </div>
  );
}
