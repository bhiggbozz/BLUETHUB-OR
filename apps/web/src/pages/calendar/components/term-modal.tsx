import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from "@bluethub/ui-kit";
import calendarService, { type CalendarSessionDto, type CalendarTermDto } from "@/services/calendar";
import { validateTerms, type TermRowErrors } from "../utils";

interface TermModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CalendarSessionDto;
  /** undefined = adding a new term */
  term?: CalendarTermDto;
  onSaved: (session: CalendarSessionDto) => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.responseMessage ?? error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function TermModal({ open, onOpenChange, session, term, onSaved }: TermModalProps) {
  const isEditing = !!term;
  const [name, setName] = useState(term?.name ?? "");
  const [startDate, setStartDate] = useState(term?.startDate ?? "");
  const [endDate, setEndDate] = useState(term?.endDate ?? "");
  const [errors, setErrors] = useState<TermRowErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(term?.name ?? "");
      setStartDate(term?.startDate ?? "");
      setEndDate(term?.endDate ?? "");
      setErrors({});
      setServerError(null);
    }
  }, [open, term]);

  const handleSave = async () => {
    const otherTerms = session.terms
      .filter((t) => t.id !== term?.id)
      .map((t) => ({ name: t.name, startDate: t.startDate, endDate: t.endDate }));
    const { rowErrors } = validateTerms(
      [...otherTerms, { name, startDate, endDate }],
      { startDate: session.startDate, endDate: session.endDate },
    );
    const thisRowErrors = rowErrors[rowErrors.length - 1];
    setErrors(thisRowErrors);
    if (thisRowErrors.name || thisRowErrors.startDate || thisRowErrors.endDate || thisRowErrors.overlap) return;

    setSaving(true);
    setServerError(null);
    try {
      const payload = { name: name.trim(), startDate, endDate };
      const res = isEditing
        ? await calendarService.updateTerm(term!.id, payload)
        : await calendarService.addTerm(session.id, payload);
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
          <DialogTitle>{isEditing ? "Edit term" : "Add term"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {serverError && (
            <div role="alert" aria-live="polite" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {errors.overlap && (
            <div role="alert" aria-live="polite" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{errors.overlap}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="term-name">Term name</Label>
            <Input id="term-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First Term" />
            {errors.name && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="term-start">Start date</Label>
              <Input id="term-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {errors.startDate && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.startDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="term-end">End date</Label>
              <Input id="term-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
            {saving ? "Saving…" : isEditing ? "Save changes" : "Add term"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TermModal;
