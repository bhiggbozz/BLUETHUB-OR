import { ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";
import type { DifficultyAvailability } from "@/services/parent-assessment";
import { cn } from "@/lib/utils";
import { Button } from "../../component/ui/button";
import { EmptyState, InlineNotice } from "../../component/ui/feedback";
import { AnimatedNumber } from "../../component/ui/data-viz";
import { Info, Layers } from "lucide-react";

interface DifficultyStepProps {
  availability: DifficultyAvailability[];
  counts: Record<number, number>;
  onCount: (level: number, value: number, max: number) => void;
  total: number;
  onBack: () => void;
  onContinue: () => void;
}

const levelAccent = ["from-emerald-400 to-teal-400", "from-sky-400 to-indigo-400", "from-violet-400 to-fuchsia-400", "from-amber-400 to-rose-400"];

export function DifficultyStep({ availability, counts, onCount, total, onBack, onContinue }: DifficultyStepProps) {
  const totalAvailable = availability.reduce((n, d) => n + d.availableCount, 0);

  return (
    <section className="pp-surface">
      <div className="p-5 sm:p-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full px-2 py-1 -ml-2 text-[12px] font-semibold text-(--pp-muted) hover:bg-(--pp-sunken) hover:text-(--pp-text)"
        >
          <ArrowLeft className="size-3.5" /> Topics
        </button>
        <p className="pp-eyebrow">Step 2</p>
        <h2 className="pp-display mt-1 text-[19px] font-semibold text-(--pp-text)">How many questions of each level?</h2>
        <p className="mt-1 text-[13px] leading-5 text-(--pp-muted)">
          Counts are capped at what's in the question bank for your topics. We've suggested up to 5 per level.
        </p>
      </div>

      <div className="px-5 pb-5 sm:px-6">
        {totalAvailable === 0 ? (
          <EmptyState
            compact
            icon={<Layers className="size-5" />}
            title="No questions available for these topics yet"
            description="Teachers haven't added questions for them. Go back and try different topics."
            action={
              <Button variant="secondary" size="sm" onClick={onBack}>
                Choose other topics
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {availability.map((d, i) => {
              const value = counts[d.difficultyLevel] ?? 0;
              const disabled = d.availableCount === 0;
              const pct = d.availableCount === 0 ? 0 : (value / d.availableCount) * 100;
              const inputId = `diff-${d.difficultyLevel}`;
              return (
                <div
                  key={d.difficultyLevel}
                  className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    disabled ? "border-dashed border-(--pp-line) bg-(--pp-sunken)" : value > 0 ? "border-(--pp-line-strong)" : "border-(--pp-line)",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <label htmlFor={inputId} className="text-[14px] font-semibold text-(--pp-text)">
                        {d.difficultyLevelName}
                      </label>
                      <p className="text-[12px] text-(--pp-subtle)">
                        {disabled ? "None available" : `${d.availableCount} available`}
                      </p>
                    </div>
                    <div className={cn("flex items-center gap-1 rounded-xl border border-(--pp-line) bg-(--pp-surface) p-1", disabled && "opacity-50")}>
                      <button
                        type="button"
                        aria-label={`Fewer ${d.difficultyLevelName} questions`}
                        disabled={disabled || value === 0}
                        onClick={() => onCount(d.difficultyLevel, value - 1, d.availableCount)}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-(--pp-muted) hover:bg-(--pp-sunken) disabled:opacity-35"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        id={inputId}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={d.availableCount}
                        disabled={disabled}
                        value={value}
                        onChange={(e) => onCount(d.difficultyLevel, Number(e.target.value) || 0, d.availableCount)}
                        className="pp-num h-8 w-11 rounded-md bg-transparent text-center text-[15px] font-semibold text-(--pp-text) [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        aria-label={`More ${d.difficultyLevelName} questions`}
                        disabled={disabled || value >= d.availableCount}
                        onClick={() => onCount(d.difficultyLevel, value + 1, d.availableCount)}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-(--pp-muted) hover:bg-(--pp-sunken) disabled:opacity-35"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-(--pp-line)" aria-hidden>
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-300", levelAccent[i % levelAccent.length])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalAvailable > 0 && total > 40 && (
          <InlineNotice tone="warn" icon={<Info className="size-4" />} className="mt-4">
            That's a long assessment. Shorter quizzes of 10 to 20 questions are usually easier to finish at home.
          </InlineNotice>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-(--pp-line) p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-[13px] text-(--pp-muted)" aria-live="polite">
          <AnimatedNumber value={total} className="text-[15px] font-semibold text-(--pp-text)" /> question{total === 1 ? "" : "s"} in total
        </p>
        <Button onClick={onContinue} disabled={total === 0} trailing={<ArrowRight className="size-4" />} className="w-full sm:w-auto">
          Continue
        </Button>
      </div>
    </section>
  );
}
