import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@bluethub/ui-kit";
import { Info, Minus, Plus, Sparkles } from "lucide-react";
import { useDispatch } from "react-redux";
import { cn } from "@/lib/utils";
import parentQuizService, { type ParentQuizSettingsDto } from "@/services/parent-quiz";
import { setSettings } from "@/store/parent-quiz-slice";
import { Button } from "../../component/ui/button";
import { ErrorState, InlineNotice } from "../../component/ui/feedback";
import { Segmented } from "../../component/ui/segmented";
import { extractErrorMessage } from "../../lib/format";
import { MODE_OPTIONS } from "../lib";

const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 30;

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ParentQuizSettingsDto;
}

export function SettingsDialog({ open, onOpenChange, settings }: SettingsDialogProps) {
  const dispatch = useDispatch();
  const [draft, setDraft] = useState<ParentQuizSettingsDto>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setError(null);
    }
  }, [open, settings]);

  const noLimit = (draft.timeLimitMinutes ?? 0) === 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await parentQuizService.saveSettings({
        questionCount: draft.questionCount,
        mode: draft.mode,
        timeLimitMinutes: noLimit ? null : draft.timeLimitMinutes,
        passMarkPercent: draft.passMarkPercent,
        shuffleQuestions: draft.shuffleQuestions,
      });
      const data = res.data?.data;
      if (data) dispatch(setSettings(data));
      onOpenChange(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't save your defaults. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parent-ui max-w-md border-(--pp-line) bg-(--pp-surface) p-0 shadow-(--pp-shadow-lg)">
        <DialogHeader className="p-5 pb-0 sm:p-6 sm:pb-0">
          <DialogTitle className="pp-display text-[18px] font-semibold text-(--pp-text)">Default quiz settings</DialogTitle>
          <DialogDescription className="text-[13px] text-(--pp-muted)">
            Used every time you tap "Create quiz" — change any of these for just one quiz from the Advanced section instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-5 sm:p-6">
          {!settings.isCustomised && (
            <InlineNotice tone="iris" icon={<Sparkles className="size-4" />}>
              Set your defaults once, then creating a quiz is one tap.
            </InlineNotice>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-(--pp-text)">Number of questions</label>
            <div className="flex items-center gap-1 rounded-xl border border-(--pp-line) bg-(--pp-sunken) p-1 w-fit">
              <button
                type="button"
                aria-label="Fewer questions"
                disabled={draft.questionCount <= MIN_QUESTIONS}
                onClick={() => setDraft((d) => ({ ...d, questionCount: Math.max(MIN_QUESTIONS, d.questionCount - 1) }))}
                className="inline-flex size-9 items-center justify-center rounded-lg text-(--pp-muted) hover:bg-(--pp-surface) disabled:opacity-35"
              >
                <Minus className="size-4" />
              </button>
              <span className="pp-num w-10 text-center text-[15px] font-semibold text-(--pp-text)">{draft.questionCount}</span>
              <button
                type="button"
                aria-label="More questions"
                disabled={draft.questionCount >= MAX_QUESTIONS}
                onClick={() => setDraft((d) => ({ ...d, questionCount: Math.min(MAX_QUESTIONS, d.questionCount + 1) }))}
                className="inline-flex size-9 items-center justify-center rounded-lg text-(--pp-muted) hover:bg-(--pp-surface) disabled:opacity-35"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-(--pp-subtle)">Between 5 and 30.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-(--pp-text)">Difficulty</label>
            <Segmented value={draft.mode} onChange={(v) => setDraft((d) => ({ ...d, mode: v }))} options={MODE_OPTIONS} label="Difficulty" size="sm" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-(--pp-text)">
              Time limit
              <button
                type="button"
                role="switch"
                aria-checked={noLimit}
                onClick={() => setDraft((d) => ({ ...d, timeLimitMinutes: noLimit ? 20 : 0 }))}
                className="flex items-center gap-2 text-[11px] font-medium text-(--pp-muted)"
              >
                No time limit
                <span
                  aria-hidden
                  className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", noLimit ? "bg-(--pp-iris)" : "bg-(--pp-line-strong)")}
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
                  value={draft.timeLimitMinutes ?? 20}
                  onChange={(e) => setDraft((d) => ({ ...d, timeLimitMinutes: Math.max(1, Math.min(180, Number(e.target.value) || 1)) }))}
                  className="pp-input pp-num pr-14"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-(--pp-subtle)">min</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-(--pp-text)">Pass mark</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={100}
                value={draft.passMarkPercent}
                onChange={(e) => setDraft((d) => ({ ...d, passMarkPercent: Number(e.target.value) }))}
                aria-label="Pass mark slider"
                className="pp-range min-w-0 flex-1"
                style={{ "--pp-fill": `${draft.passMarkPercent}%` } as React.CSSProperties}
              />
              <div className="relative w-20">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={draft.passMarkPercent}
                  onChange={(e) => setDraft((d) => ({ ...d, passMarkPercent: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))}
                  className="pp-input pp-num pr-8"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-(--pp-subtle)">%</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={draft.shuffleQuestions}
            onClick={() => setDraft((d) => ({ ...d, shuffleQuestions: !d.shuffleQuestions }))}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-(--pp-line) p-3.5 text-left hover:bg-(--pp-sunken)"
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-(--pp-text)">Shuffle question order</span>
              <span className="mt-0.5 flex items-start gap-1.5 text-[11px] text-(--pp-subtle)">
                <Info className="mt-0.5 size-3 shrink-0" /> Each quiz gets its own order.
              </span>
            </span>
            <span
              aria-hidden
              className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", draft.shuffleQuestions ? "bg-(--pp-iris)" : "bg-(--pp-line-strong)")}
            >
              <span className={cn("absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform", draft.shuffleQuestions && "translate-x-5")} />
            </span>
          </button>

          {error && <ErrorState message={error} />}
        </div>

        <DialogFooter className="gap-2 border-t border-(--pp-line) p-5 sm:p-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            Save defaults
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
