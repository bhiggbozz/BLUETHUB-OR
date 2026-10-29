import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Label } from "@bluethub/ui-kit";
import type { CalendarTermPayload } from "@/services/calendar";
import { MAX_TERMS, MIN_TERMS, type TermRowErrors } from "../utils";
import PreviewStrip from "./preview-strip";

interface StepTermsProps {
  session: { startDate: string; endDate: string };
  terms: CalendarTermPayload[];
  rowErrors: TermRowErrors[];
  onChange: (terms: CalendarTermPayload[]) => void;
}

export function StepTerms({ session, terms, rowErrors, onChange }: StepTermsProps) {
  const updateTerm = (idx: number, patch: Partial<CalendarTermPayload>) => {
    onChange(terms.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const addTerm = () => {
    if (terms.length >= MAX_TERMS) return;
    onChange([...terms, { name: "", startDate: "", endDate: "" }]);
  };

  const removeTerm = (idx: number) => {
    if (terms.length <= MIN_TERMS) return;
    onChange(terms.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <PreviewStrip session={session} terms={terms} rowErrors={rowErrors} />

      <div className="space-y-3">
        {terms.map((term, idx) => {
          const errors = rowErrors[idx] ?? {};
          return (
            <div key={idx} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`term-name-${idx}`} className="text-xs font-semibold text-slate-500">
                  Term {idx + 1}
                </Label>
                {terms.length > MIN_TERMS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-rose-600"
                    aria-label={`Remove term ${idx + 1}`}
                    onClick={() => removeTerm(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="mt-2 space-y-2">
                <Input
                  id={`term-name-${idx}`}
                  value={term.name}
                  onChange={(e) => updateTerm(idx, { name: e.target.value })}
                  placeholder="First Term"
                />
                {errors.name && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.name}</p>}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="date"
                      aria-label={`Term ${idx + 1} start date`}
                      value={term.startDate}
                      onChange={(e) => updateTerm(idx, { startDate: e.target.value })}
                    />
                    {errors.startDate && <p role="alert" aria-live="polite" className="mt-1 text-xs text-rose-600">{errors.startDate}</p>}
                  </div>
                  <div>
                    <Input
                      type="date"
                      aria-label={`Term ${idx + 1} end date`}
                      value={term.endDate}
                      onChange={(e) => updateTerm(idx, { endDate: e.target.value })}
                    />
                    {errors.endDate && <p role="alert" aria-live="polite" className="mt-1 text-xs text-rose-600">{errors.endDate}</p>}
                  </div>
                </div>
                {errors.overlap && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.overlap}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={terms.length >= MAX_TERMS}
        onClick={addTerm}
        className="w-full"
        title={terms.length >= MAX_TERMS ? `A session can have at most ${MAX_TERMS} terms` : undefined}
      >
        <Plus className="h-3.5 w-3.5" />
        Add another term
      </Button>
    </div>
  );
}

export default StepTerms;
