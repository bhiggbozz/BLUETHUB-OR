import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from "@bluethub/ui-kit";
import calendarService, { type CalendarSessionDto } from "@/services/calendar";
import { isBeforeISO, validateSessionFields, type SessionFormErrors } from "../utils";

interface EditYearModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CalendarSessionDto;
  onSaved: (session: CalendarSessionDto) => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.responseMessage ?? error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function EditYearModal({ open, onOpenChange, session, onSaved }: EditYearModalProps) {
  const [name, setName] = useState(session.name);
  const [startDate, setStartDate] = useState(session.startDate);
  const [endDate, setEndDate] = useState(session.endDate);
  const [errors, setErrors] = useState<SessionFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(session.name);
      setStartDate(session.startDate);
      setEndDate(session.endDate);
      setErrors({});
      setServerError(null);
    }
  }, [open, session]);

  const handleSave = async () => {
    const fieldErrors = validateSessionFields({ name, startDate, endDate });

    // Editing a session must keep every term inside it.
    const outOfBounds = session.terms.find(
      (term) => isBeforeISO(term.startDate, startDate) || isBeforeISO(endDate, term.endDate),
    );
    if (outOfBounds && !fieldErrors.startDate && !fieldErrors.endDate) {
      fieldErrors.endDate = `"${outOfBounds.name}" falls outside these dates. Adjust the term first, or widen the year.`;
    }

    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    setServerError(null);
    try {
      const res = await calendarService.updateSession(session.id, {
        name: name.trim(),
        startDate,
        endDate,
      });
      onSaved(res.data.data);
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit academic year</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {serverError && (
            <div role="alert" aria-live="polite" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="session-name">Session name</Label>
            <Input id="session-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="2026/2027" />
            {errors.name && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="session-start">Start date</Label>
              <Input id="session-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {errors.startDate && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.startDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-end">End date</Label>
              <Input id="session-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              {errors.endDate && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.endDate}</p>}
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={handleSave} className="bg-[#4F61E8] hover:bg-[#4F61E8]/90">
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EditYearModal;
