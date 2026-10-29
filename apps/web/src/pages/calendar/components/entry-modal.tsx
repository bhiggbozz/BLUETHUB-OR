import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@bluethub/ui-kit";
import { useAuthContext } from "@/contexts/auth-context";
import calendarService, {
  type CalendarEntryDto,
  type CalendarEntryScope,
  type CalendarEntryTypeDto,
  type CalendarEntryTypeKey,
  type CalendarSessionDto,
  type CalendarTermDto,
} from "@/services/calendar";
import type { EntryWriteAccess } from "../hooks/use-entry-write-access";
import { hasAnyEntryErrors, validateEntryFields, type EntryFormErrors } from "../utils";

export type EntryModalMode =
  | { kind: "create"; scope?: CalendarEntryScope; term?: CalendarTermDto }
  | { kind: "edit"; entry: CalendarEntryDto };

interface EntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CalendarSessionDto;
  access: Extract<EntryWriteAccess, { status: "granted" }>;
  entryTypes: CalendarEntryTypeDto[];
  mode: EntryModalMode;
  onSaved: (entry: CalendarEntryDto) => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.responseMessage ?? error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function EntryModal({ open, onOpenChange, session, access, entryTypes, mode, onSaved }: EntryModalProps) {
  const { user } = useAuthContext();
  const isEditing = mode.kind === "edit";
  const existing = isEditing ? mode.entry : undefined;

  const availableTypes = access.canAddHolidays ? entryTypes : entryTypes.filter((t) => t.key !== "Holiday");
  const createTerm = mode.kind === "create" ? mode.term : undefined;

  function defaultScopeType(): CalendarEntryScope {
    if (existing) return existing.scopeType;
    if (mode.kind === "create" && mode.scope) return mode.scope;
    return access.scopes[0];
  }

  const [scopeType, setScopeType] = useState<CalendarEntryScope>(defaultScopeType());
  const [classroomId, setClassroomId] = useState(existing?.classroomId ?? "");
  const [subjectId, setSubjectId] = useState(existing?.subjectId ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [entryType, setEntryType] = useState<CalendarEntryTypeKey | "">(existing?.entryType ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [startDate, setStartDate] = useState(existing?.startDate ?? createTerm?.startDate ?? "");
  const [endDate, setEndDate] = useState(existing?.endDate ?? createTerm?.startDate ?? "");
  const [errors, setErrors] = useState<EntryFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingOthersEdit, setConfirmingOthersEdit] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScopeType(defaultScopeType());
    setClassroomId(existing?.classroomId ?? "");
    setSubjectId(existing?.subjectId ?? "");
    setTitle(existing?.title ?? "");
    setEntryType(existing?.entryType ?? "");
    setStartDate(existing?.startDate ?? createTerm?.startDate ?? "");
    setEndDate(existing?.endDate ?? createTerm?.startDate ?? "");
    setDescription(existing?.description ?? "");
    setErrors({});
    setServerError(null);
    setConfirmingOthersEdit(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const bounds = (() => {
    if (scopeType === "School") return { startDate: session.startDate, endDate: session.endDate };
    if (createTerm) return { startDate: createTerm.startDate, endDate: createTerm.endDate };
    return { startDate: session.startDate, endDate: session.endDate };
  })();

  const isEditingSomeoneElse = isEditing && !!existing && existing.createdById !== user?.id;

  const scopeValid = scopeType === "School" || (scopeType === "Classroom" && !!classroomId) || (scopeType === "Subject" && !!subjectId);

  const runSave = async () => {
    setSaving(true);
    setServerError(null);
    try {
      if (isEditing && existing) {
        const res = await calendarService.updateEntry(existing.id, {
          title: title.trim(),
          entryType: entryType as CalendarEntryTypeKey,
          description: description.trim() || undefined,
          startDate,
          endDate,
        });
        onSaved(res.data.data);
      } else {
        const res = await calendarService.createEntry({
          title: title.trim(),
          entryType: entryType as CalendarEntryTypeKey,
          description: description.trim() || undefined,
          startDate,
          endDate,
          scopeType,
          classroomId: scopeType !== "School" && classroomId ? classroomId : undefined,
          subjectId: scopeType === "Subject" ? subjectId : undefined,
        });
        onSaved(res.data.data);
      }
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSaving(false);
      setConfirmingOthersEdit(false);
    }
  };

  const handleSave = () => {
    const fieldErrors = validateEntryFields({ title, entryType, description, startDate, endDate }, bounds);
    const scopeError = !scopeValid ? { scope: scopeType === "Classroom" ? "Choose a class." : "Choose a subject." } : {};
    const allErrors = { ...fieldErrors, ...scopeError };
    setErrors(allErrors);
    if (hasAnyEntryErrors(allErrors)) return;

    if (isEditingSomeoneElse && !confirmingOthersEdit) {
      setConfirmingOthersEdit(true);
      return;
    }
    void runSave();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit entry" : "Add entry"}</DialogTitle>
        </DialogHeader>

        {confirmingOthersEdit && existing ? (
          <div className="space-y-4">
            <div role="alert" aria-live="polite" className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              This entry was made by {existing.createdByName}. Your change will be visible to everyone, with the previous dates.
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setConfirmingOthersEdit(false)}>
                Back
              </Button>
              <Button type="button" disabled={saving} onClick={() => void runSave()} className="bg-[#4F61E8] hover:bg-[#4F61E8]/90">
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {saving ? "Saving…" : "Confirm and save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {serverError && (
              <div role="alert" aria-live="polite" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {!isEditing && access.scopes.length > 1 && (
              <div className="space-y-1.5">
                <Label>Scope</Label>
                <RadioGroup value={scopeType} onValueChange={(v) => setScopeType(v as CalendarEntryScope)} className="flex flex-wrap gap-3">
                  {access.scopes.map((scope) => (
                    <label key={scope} className="flex items-center gap-1.5 text-sm text-slate-700">
                      <RadioGroupItem value={scope} />
                      {scope}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {isEditing && (
              <p className="text-xs text-slate-400">
                Scope: {existing!.scopeType === "School" ? "School" : existing!.scopeType === "Subject" ? existing!.subjectName ?? "Subject" : existing!.classroomName ?? "Classroom"} (can't be changed)
              </p>
            )}

            {!isEditing && scopeType === "Classroom" && (
              <div className="space-y-1.5">
                <Label htmlFor="entry-classroom">Class</Label>
                <Select value={classroomId} onValueChange={setClassroomId}>
                  <SelectTrigger id="entry-classroom"><SelectValue placeholder="Select a class" /></SelectTrigger>
                  <SelectContent>
                    {access.classroomOptions.map((c) => (
                      <SelectItem key={c.classroomId} value={c.classroomId}>{c.className}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.scope && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.scope}</p>}
              </div>
            )}

            {!isEditing && scopeType === "Subject" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="entry-subject">Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger id="entry-subject"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                    <SelectContent>
                      {access.subjectOptions.map((s) => (
                        <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.scope && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.scope}</p>}
                </div>
                {access.classroomOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="entry-subject-classroom">Class (optional)</Label>
                    <Select value={classroomId || "__none"} onValueChange={(v) => setClassroomId(v === "__none" ? "" : v)}>
                      <SelectTrigger id="entry-subject-classroom"><SelectValue placeholder="All classes" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">All classes</SelectItem>
                        {access.classroomOptions.map((c) => (
                          <SelectItem key={c.classroomId} value={c.classroomId}>{c.className}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="entry-type">Type</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType(v as CalendarEntryTypeKey)}>
                <SelectTrigger id="entry-type"><SelectValue placeholder="Select a type" /></SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.entryType && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.entryType}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entry-title">Title</Label>
              <Input id="entry-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mid-term test week" />
              {errors.title && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="entry-start">Start date</Label>
                <Input id="entry-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                {errors.startDate && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.startDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="entry-end">End date</Label>
                <Input id="entry-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                {errors.endDate && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.endDate}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entry-description">Description (optional)</Label>
              <Textarea id="entry-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              {errors.description && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.description}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={handleSave} className="bg-[#4F61E8] hover:bg-[#4F61E8]/90">
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {saving ? "Saving…" : isEditing ? "Save changes" : "Add entry"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EntryModal;
