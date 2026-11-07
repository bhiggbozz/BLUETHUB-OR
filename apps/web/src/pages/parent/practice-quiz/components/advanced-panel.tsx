import { ChevronRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Segmented } from "../../component/ui/segmented";
import type { ParentQuizMode, ParentQuizSettingsDto } from "@/services/parent-quiz";
import { MODE_OPTIONS } from "../lib";

const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 30;
const MAX_TITLE = 120;

export interface AdvancedOverrides {
  questionCount?: number;
  mode?: ParentQuizMode;
  /** 0 = no limit for this quiz only; undefined = untouched, use the saved default */
  timeLimitMinutes?: number;
  title?: string;
}

interface AdvancedPanelProps {
  open: boolean;
  onToggleOpen: () => void;
  value: AdvancedOverrides;
  defaults: ParentQuizSettingsDto;
  onChange: (patch: Partial<AdvancedOverrides>) => void;
}

export function AdvancedPanel({ open, onToggleOpen, value, defaults, onChange }: AdvancedPanelProps) {
  const questionCount = value.questionCount ?? defaults.questionCount;
  const mode = value.mode ?? defaults.mode;
  const noLimit = (value.timeLimitMinutes ?? defaults.timeLimitMinutes ?? 0) === 0;
  const minutes = value.timeLimitMinutes ?? defaults.timeLimitMinutes ?? 20;

  return (
    <div className="rounded-2xl border border-(--pp-line)">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-(--pp-text)">Advanced — just this quiz</span>
        <ChevronRight className={cn("size-4 text-(--pp-subtle) transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-(--pp-line) p-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-(--pp-text)">Number of questions</label>
            <div className="flex items-center gap-1 rounded-xl border border-(--pp-line) bg-(--pp-surface) p-1 w-fit">
              <button
                type="button"
                aria-label="Fewer questions"
                disabled={questionCount <= MIN_QUESTIONS}
                onClick={() => onChange({ questionCount: Math.max(MIN_QUESTIONS, questionCount - 1) })}
                className="inline-flex size-9 items-center justify-center rounded-lg text-(--pp-muted) hover:bg-(--pp-sunken) disabled:opacity-35"
              >
                <Minus className="size-4" />
              </button>
              <span className="pp-num w-10 text-center text-[15px] font-semibold text-(--pp-text)">{questionCount}</span>
              <button
                type="button"
                aria-label="More questions"
                disabled={questionCount >= MAX_QUESTIONS}
                onClick={() => onChange({ questionCount: Math.min(MAX_QUESTIONS, questionCount + 1) })}
                className="inline-flex size-9 items-center justify-center rounded-lg text-(--pp-muted) hover:bg-(--pp-sunken) disabled:opacity-35"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-(--pp-text)">Difficulty</label>
            <Segmented value={mode} onChange={(v) => onChange({ mode: v })} options={MODE_OPTIONS} label="Difficulty" size="sm" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-(--pp-text)">
              Time limit
              <button
                type="button"
                role="switch"
                aria-checked={noLimit}
                onClick={() => onChange({ timeLimitMinutes: noLimit ? minutes : 0 })}
                className="flex items-center gap-2 text-[11px] font-medium text-(--pp-muted)"
              >
                No time limit
                <span
                  aria-hidden
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                    noLimit ? "bg-(--pp-iris)" : "bg-(--pp-line-strong)",
                  )}
                >
                  <span className={cn("absolute left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform", noLimit && "translate-x-4")} />
                </span>
              </button>
            </label>
            {!noLimit && (
              <div className="relative w-28">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={180}
                  value={minutes}
                  onChange={(e) => onChange({ timeLimitMinutes: Math.max(1, Math.min(180, Number(e.target.value) || 1)) })}
                  className="pp-input pp-num pr-14"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-(--pp-subtle)">min</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-(--pp-text)">Title (optional)</label>
            <input
              type="text"
              value={value.title ?? ""}
              maxLength={MAX_TITLE}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="We'll name it for you if you leave this blank"
              className="pp-input"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedPanel;
