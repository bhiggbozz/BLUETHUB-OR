import { Button, Popover, PopoverContent, PopoverTrigger } from "@bluethub/ui-kit";
import { SlidersHorizontal } from "lucide-react";
import BoardSectionLabel from "./board-section-label";

interface BoardPropertiesPanelProps {
  tool: "pen" | "eraser";
  width: number;
  onWidthChange: (w: number) => void;
  widths: number[];
  /** Display-only — the eraser's width isn't adjustable, this just tells
   * the viewer why nothing in this section is clickable. */
  eraserWidth: number;
  colorMode: "palette" | "fixed";
  color?: string;
  onColorChange?: (c: string) => void;
  palette?: string[];
  fixedColor?: string;
  fixedColorLabel?: string;
  className?: string;
}

function PropertiesSections({
  tool,
  width,
  onWidthChange,
  widths,
  eraserWidth,
  colorMode,
  color,
  onColorChange,
  palette,
  fixedColor,
  fixedColorLabel,
}: Omit<BoardPropertiesPanelProps, "className">) {
  if (tool === "eraser") {
    return (
      <div>
        <BoardSectionLabel>Eraser</BoardSectionLabel>
        <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-slate-700">
            <span className="size-2.5 rounded-full bg-white" />
          </span>
          <p className="text-xs font-medium text-slate-600">Fixed width · {eraserWidth}px</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <BoardSectionLabel>{colorMode === "palette" ? "Color" : "Ink"}</BoardSectionLabel>
        {colorMode === "palette" ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {(palette ?? []).map((c) => (
              <button
                key={c}
                onClick={() => onColorChange?.(c)}
                aria-label={`Use colour ${c}`}
                className={`size-8 rounded-full ring-2 ring-offset-2 transition-all ${
                  color === c ? "scale-110 ring-chestnut" : "ring-transparent hover:scale-105 hover:ring-slate-200"
                }`}
                style={{ backgroundColor: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700">
            <span
              className="size-4 rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
              style={{ backgroundColor: fixedColor }}
            />
            {fixedColorLabel}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-100" />

      <div>
        <BoardSectionLabel>Width</BoardSectionLabel>
        <div className="mt-2.5 flex items-center gap-2">
          {widths.map((w) => (
            <button
              key={w}
              onClick={() => onWidthChange(w)}
              aria-label={`Use pen width ${w}`}
              className={`flex size-10 items-center justify-center rounded-xl border transition-all ${
                width === w
                  ? "border-chestnut bg-chestnut/5 shadow-[0_2px_6px_-2px_rgba(41,35,130,0.35)]"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span
                className={`rounded-full ${width === w ? "bg-chestnut" : "bg-slate-700"}`}
                style={{ width: w + 3, height: w + 3 }}
              />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/** Desktop-persistent properties panel — sits to the right of the canvas.
 * Hidden below `md` regardless of its position in document order (see
 * `live-board.tsx`'s layout note), so it never affects the mobile layout. */
export function BoardPropertiesPanel(props: BoardPropertiesPanelProps) {
  const { className, ...sectionProps } = props;
  return (
    <div
      className={`hidden flex-col gap-3.5 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)] md:flex md:w-56 md:self-start ${className ?? ""}`}
    >
      <PropertiesSections {...sectionProps} />
    </div>
  );
}

/** Mobile/tablet equivalent — a small icon button that opens the same
 * sections in a popover, replacing the persistent panel below `md`. */
export function BoardPropertiesTrigger(props: BoardPropertiesPanelProps) {
  const { className, ...sectionProps } = props;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className={`md:hidden ${className ?? ""}`} title="Pen settings">
          <SlidersHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-64 space-y-4 p-3">
        <PropertiesSections {...sectionProps} />
      </PopoverContent>
    </Popover>
  );
}
