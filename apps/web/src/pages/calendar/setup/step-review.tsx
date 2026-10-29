import { AlertCircle } from "lucide-react";
import type { CalendarTermPayload } from "@/services/calendar";
import { formatDisplayRange, termLengthWeeks } from "../utils";

interface StepReviewProps {
  name: string;
  startDate: string;
  endDate: string;
  terms: CalendarTermPayload[];
  submitError: string | null;
}

export function StepReview({ name, startDate, endDate, terms, submitError }: StepReviewProps) {
  return (
    <div className="space-y-4">
      {submitError && (
        <div role="alert" aria-live="polite" className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">{submitError}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-bold text-slate-800">{name}</p>
        <p className="mt-0.5 text-xs text-slate-500">{formatDisplayRange(startDate, endDate)}</p>
      </div>

      <ol className="space-y-2">
        {terms.map((term, idx) => (
          <li key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-700">{term.name}</p>
              <p className="text-xs text-slate-500">{formatDisplayRange(term.startDate, term.endDate)}</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-slate-400">{termLengthWeeks(term)} wks</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default StepReview;
