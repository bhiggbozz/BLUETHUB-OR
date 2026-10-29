import type { CalendarTermPayload } from "@/services/calendar";
import { daysInclusive, isBeforeISO, type TermRowErrors } from "../utils";

interface PreviewStripProps {
  session: { startDate: string; endDate: string };
  terms: CalendarTermPayload[];
  rowErrors: TermRowErrors[];
}

function rowHasError(e: TermRowErrors | undefined): boolean {
  return !!e && !!(e.name || e.startDate || e.endDate || e.overlap);
}

export function PreviewStrip({ session, terms, rowErrors }: PreviewStripProps) {
  const sessionValid = !!session.startDate && !!session.endDate && !isBeforeISO(session.endDate, session.startDate);
  const totalDays = sessionValid ? daysInclusive(session.startDate, session.endDate) : 0;

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-500">Preview</p>
      <div className="flex h-9 w-full gap-0.5 overflow-hidden rounded-lg bg-slate-100 p-0.5">
        {terms.length === 0 && (
          <div className="flex w-full items-center justify-center text-xs text-slate-400">Add a term to see it here</div>
        )}
        {terms.map((term, idx) => {
          const errored = rowHasError(rowErrors[idx]);
          const complete = !!term.startDate && !!term.endDate && !isBeforeISO(term.endDate, term.startDate);
          const widthPct =
            sessionValid && complete ? Math.max((daysInclusive(term.startDate, term.endDate) / totalDays) * 100, 4) : 100 / terms.length;

          return (
            <div
              key={idx}
              style={{ width: `${widthPct}%` }}
              title={errored ? rowErrors[idx]?.overlap ?? rowErrors[idx]?.startDate ?? rowErrors[idx]?.endDate ?? rowErrors[idx]?.name : term.name}
              className={[
                "flex h-full min-w-6 items-center justify-center overflow-hidden rounded-md text-[10px] font-semibold",
                errored ? "bg-rose-500 text-white" : complete ? "bg-[#4F61E8] text-white" : "bg-slate-300 text-slate-600",
              ].join(" ")}
            >
              <span className="truncate px-1">{term.name || "Untitled"}</span>
            </div>
          );
        })}
      </div>

      {rowErrors.some((e) => rowHasError(e)) && (
        <ul className="mt-2 space-y-1">
          {terms.map((term, idx) => {
            const e = rowErrors[idx];
            if (!rowHasError(e)) return null;
            const message = e.overlap ?? e.startDate ?? e.endDate ?? e.name;
            return (
              <li key={idx} role="alert" aria-live="polite" className="text-xs text-rose-600">
                <span className="font-semibold">{term.name || `Term ${idx + 1}`}:</span> {message}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PreviewStrip;
