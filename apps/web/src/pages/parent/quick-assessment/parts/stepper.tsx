import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { smooth } from "../../component/ui/motion";

export type StepNumber = 1 | 2 | 3;

export const STEPS = [
  { n: 1, label: "Topics", hint: "What was taught" },
  { n: 2, label: "Questions", hint: "How many, how hard" },
  { n: 3, label: "Settings", hint: "Time and results" },
] as const;

interface StepperProps {
  step: StepNumber;
  /** Steps the parent may jump back to. Forward jumps go through each step's Continue button. */
  onJump: (n: StepNumber) => void;
}

export function Stepper({ step, onJump }: StepperProps) {
  return (
    <nav aria-label="Progress" className="pp-surface-flat p-2">
      <ol className="relative grid grid-cols-3 gap-1">
        {STEPS.map((s) => {
          const active = s.n === step;
          const done = s.n < step;
          return (
            <li key={s.n} className="relative">
              <button
                type="button"
                disabled={!done}
                onClick={() => onJump(s.n)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left transition-colors sm:px-3",
                  done && "hover:bg-(--pp-sunken)",
                  !done && !active && "cursor-default",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="step-active"
                    transition={smooth}
                    className="absolute inset-0 rounded-[14px] bg-(--pp-solid) shadow-[0_8px_20px_-10px_rgba(11,13,31,0.6)]"
                  />
                )}
                <span
                  className={cn(
                    "pp-num relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                    active && "bg-white/12 text-white",
                    done && "bg-(--pp-present-soft) text-(--pp-present)",
                    !active && !done && "bg-(--pp-sunken) text-(--pp-subtle)",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : s.n}
                </span>
                <span className="relative min-w-0">
                  <span
                    className={cn(
                      "block truncate text-[13px] font-semibold",
                      active ? "text-white" : "text-(--pp-text) max-sm:sr-only",
                    )}
                  >
                    {s.label}
                  </span>
                  <span className={cn("hidden truncate text-[11px] sm:block", active ? "text-white/55" : "text-(--pp-subtle)")}>
                    {s.hint}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mx-2 mt-2 h-1 overflow-hidden rounded-full bg-(--pp-line)">
        <motion.div
          className="h-full origin-left rounded-full bg-gradient-to-r from-(--pp-iris) to-(--pp-glow)"
          initial={false}
          animate={{ scaleX: step / STEPS.length }}
          transition={smooth}
        />
      </div>
    </nav>
  );
}
