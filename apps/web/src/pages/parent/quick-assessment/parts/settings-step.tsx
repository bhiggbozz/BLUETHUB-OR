import { useId } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../component/ui/button";
import { ErrorState } from "../../component/ui/feedback";

export interface AssessmentSettings {
  title: string;
  timeLimitMinutes: number;
  passMarkPercent: number;
  showResultImmediately: boolean;
  showCorrectAnswers: boolean;
  expiresAt: string;
}

export const MAX_TITLE = 120;
export const MAX_MINUTES = 240;

export function validateSettings(s: AssessmentSettings) {
  const errors: Partial<Record<keyof AssessmentSettings, string>> = {};
  if (s.title.length > MAX_TITLE) errors.title = `Keep the title under ${MAX_TITLE} characters.`;
  if (!Number.isFinite(s.timeLimitMinutes) || s.timeLimitMinutes < 1 || s.timeLimitMinutes > MAX_MINUTES)
    errors.timeLimitMinutes = `Choose between 1 and ${MAX_MINUTES} minutes.`;
  if (!Number.isFinite(s.passMarkPercent) || s.passMarkPercent < 0 || s.passMarkPercent > 100)
    errors.passMarkPercent = "Choose a pass mark from 0 to 100%.";
  if (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now())
    errors.expiresAt = "The deadline needs to be in the future.";
  return errors;
}

interface SettingsStepProps {
  value: AssessmentSettings;
  onChange: (patch: Partial<AssessmentSettings>) => void;
  titlePlaceholder: string;
  firstName: string;
  showErrors: boolean;
  onBack: () => void;
  onCreate: () => void;
  creating: boolean;
  createError: string | null;
}

const TIME_PRESETS = [10, 20, 30, 45];

export function SettingsStep({
  value: v,
  onChange,
  titlePlaceholder,
  firstName,
  showErrors,
  onBack,
  onCreate,
  creating,
  createError,
}: SettingsStepProps) {
  const errors = showErrors ? validateSettings(v) : {};
  const id = useId();
  const f = (k: string) => `${id}-${k}`;

  return (
    <section className="pp-surface">
      <div className="p-5 sm:p-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 -ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-semibold text-(--pp-muted) hover:bg-(--pp-sunken) hover:text-(--pp-text)"
        >
          <ArrowLeft className="size-3.5" /> Questions
        </button>
        <p className="pp-eyebrow">Step 3</p>
        <h2 className="pp-display mt-1 text-[19px] font-semibold text-(--pp-text)">Final touches</h2>
        <p className="mt-1 text-[13px] leading-5 text-(--pp-muted)">
          When you create it, the assessment is assigned to {firstName} straight away.
        </p>
      </div>

      <form
        className="space-y-5 px-5 pb-5 sm:px-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onCreate();
        }}
      >
        <Field id={f("title")} label="Title" hint="Optional. We'll name it for you if you leave it blank." error={errors.title}>
          <input
            id={f("title")}
            type="text"
            value={v.title}
            maxLength={MAX_TITLE + 20}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={titlePlaceholder}
            aria-invalid={Boolean(errors.title)}
            className="pp-input"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={f("time")} label="Time limit" error={errors.timeLimitMinutes}>
            <div className="relative">
              <input
                id={f("time")}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_MINUTES}
                value={Number.isFinite(v.timeLimitMinutes) ? v.timeLimitMinutes : ""}
                onChange={(e) => onChange({ timeLimitMinutes: e.target.value === "" ? NaN : Number(e.target.value) })}
                aria-invalid={Boolean(errors.timeLimitMinutes)}
                className="pp-input pp-num pr-16"
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[12px] text-(--pp-subtle)">minutes</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TIME_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChange({ timeLimitMinutes: m })}
                  className={cn(
                    "pp-num h-7 rounded-full border px-2.5 text-[12px] font-semibold transition-colors",
                    v.timeLimitMinutes === m
                      ? "border-(--pp-iris) bg-(--pp-iris-soft) text-(--pp-iris)"
                      : "border-(--pp-line) text-(--pp-muted) hover:border-(--pp-line-strong)",
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
          </Field>

          <Field id={f("pass")} label="Pass mark" error={errors.passMarkPercent}>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Number.isFinite(v.passMarkPercent) ? v.passMarkPercent : 0}
                onChange={(e) => onChange({ passMarkPercent: Number(e.target.value) })}
                aria-label="Pass mark slider"
                className="pp-range min-w-0 flex-1"
                style={{ "--pp-fill": `${Number.isFinite(v.passMarkPercent) ? v.passMarkPercent : 0}%` } as React.CSSProperties}
              />
              <div className="relative w-24">
                <input
                  id={f("pass")}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={Number.isFinite(v.passMarkPercent) ? v.passMarkPercent : ""}
                  onChange={(e) => onChange({ passMarkPercent: e.target.value === "" ? NaN : Number(e.target.value) })}
                  aria-invalid={Boolean(errors.passMarkPercent)}
                  className="pp-input pp-num pr-8"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-(--pp-subtle)">%</span>
              </div>
            </div>
          </Field>
        </div>

        <Field id={f("deadline")} label="Deadline" hint="Optional. Leave blank for no deadline." error={errors.expiresAt}>
          <input
            id={f("deadline")}
            type="datetime-local"
            value={v.expiresAt}
            onChange={(e) => onChange({ expiresAt: e.target.value })}
            aria-invalid={Boolean(errors.expiresAt)}
            className="pp-input sm:max-w-xs"
          />
        </Field>

        <div className="divide-y divide-(--pp-line) rounded-2xl border border-(--pp-line)">
          <ToggleRow
            label="Show the score straight after submitting"
            hint={`${firstName} sees how they did as soon as they finish.`}
            checked={v.showResultImmediately}
            onChange={(c) => onChange({ showResultImmediately: c })}
          />
          <ToggleRow
            label="Show the correct answers afterwards"
            hint="Useful for learning from mistakes."
            checked={v.showCorrectAnswers}
            onChange={(c) => onChange({ showCorrectAnswers: c })}
          />
        </div>

        {createError && <ErrorState title="We couldn't create the assessment" message={createError} />}

        <div className="flex flex-col-reverse gap-3 border-t border-(--pp-line) pt-5 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="ghost" onClick={onBack} className="w-full sm:w-auto">
            Back
          </Button>
          <Button type="submit" loading={creating} icon={<Send className="size-4" />} className="w-full sm:w-auto">
            Create and assign
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-(--pp-text)">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] font-medium text-(--pp-absent)" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-(--pp-subtle)">{hint}</p>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 p-4 text-left first:rounded-t-2xl last:rounded-b-2xl hover:bg-(--pp-sunken)"
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-(--pp-text)">{label}</span>
        <span className="block text-[12px] text-(--pp-subtle)">{hint}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
          checked ? "bg-(--pp-iris)" : "bg-(--pp-line-strong)",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
