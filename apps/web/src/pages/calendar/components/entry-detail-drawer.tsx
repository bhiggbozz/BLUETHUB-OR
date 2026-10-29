import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@bluethub/ui-kit";
import calendarService, { type CalendarEntryDto } from "@/services/calendar";
import { formatEntryRange, formatLocalDateTime } from "../utils";
import EntryTypeBadge from "./entry-type-badge";

interface EntryDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string | null;
  entryTypeLabels: Record<string, string>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.responseMessage ?? error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function scopeLabel(entry: CalendarEntryDto): string {
  if (entry.scopeType === "School") return "School";
  if (entry.scopeType === "Subject") return entry.subjectName ?? "Subject";
  return entry.classroomName ?? "Classroom";
}

export function EntryDetailDrawer({ open, onOpenChange, entryId, entryTypeLabels }: EntryDetailDrawerProps) {
  const [entry, setEntry] = useState<CalendarEntryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !entryId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    calendarService
      .getEntry(entryId)
      .then((res) => {
        if (!cancelled) setEntry(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entryId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entry details</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!loading && error && (
          <div role="alert" aria-live="polite" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && entry && (
          <div className="space-y-4">
            <div>
              <EntryTypeBadge type={entry.entryType} label={entryTypeLabels[entry.entryType] ?? entry.entryType} />
              <h2 className="mt-1.5 text-sm font-bold text-slate-900">{entry.title}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{formatEntryRange(entry.startDate, entry.endDate)}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {scopeLabel(entry)} · {entry.createdByName}, {entry.createdByRole}
              </p>
            </div>

            {entry.description && <p className="text-sm text-slate-700">{entry.description}</p>}

            {entry.lastChange && (
              <div role="status" className="rounded-lg bg-violet-50 px-3 py-2.5 text-xs text-violet-700">
                {entry.lastChange.message}
              </div>
            )}

            {entry.changes && entry.changes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600">History</p>
                <ul className="space-y-2.5 border-l border-slate-200 pl-3">
                  {entry.changes.map((change, idx) => (
                    <li key={idx} className="text-xs text-slate-600">
                      <p className="font-medium text-slate-700">
                        {change.changedByName} <span className="text-slate-400">· {change.changedByRole}</span>
                      </p>
                      <p className="text-slate-400">{formatLocalDateTime(change.changedAt)}</p>
                      <p className="mt-0.5">{change.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EntryDetailDrawer;
