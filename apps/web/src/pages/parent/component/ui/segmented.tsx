import { useId, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springy } from "./motion";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}

/** Radio-group semantics with an animated thumb. Arrow keys move between options. */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = "md" }: SegmentedProps<T>) {
  const id = useId();

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length];
    onChange(next.value);
    const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`);
    el?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("inline-flex rounded-xl border border-(--pp-line) bg-(--pp-sunken) p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-value={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-[9px] font-semibold whitespace-nowrap transition-colors",
              size === "sm" ? "h-8 min-w-0 px-2.5 text-[12px]" : "h-9 px-3.5 text-[13px]",
              active ? "text-(--pp-text)" : "text-(--pp-subtle) hover:text-(--pp-text)",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={springy}
                className="absolute inset-0 rounded-[9px] bg-(--pp-surface) shadow-(--pp-thumb-shadow)"
              />
            )}
            <span className="relative">{o.label}</span>
            {o.count !== undefined && (
              <span
                className={cn(
                  "pp-num relative rounded-full px-1.5 text-[11px] leading-[18px]",
                  active ? "bg-(--pp-iris-soft) text-(--pp-iris)" : "bg-(--pp-text)/5",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
