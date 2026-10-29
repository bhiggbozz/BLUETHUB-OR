import { EllipsisVertical, History, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@bluethub/ui-kit";
import type { CalendarEntryDto } from "@/services/calendar";
import { formatEntryRange } from "../utils";
import EntryTypeBadge from "./entry-type-badge";

interface EntryCardProps {
  entry: CalendarEntryDto;
  entryTypeLabel: string;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function scopeLabel(entry: CalendarEntryDto): string {
  if (entry.scopeType === "School") return "School";
  if (entry.scopeType === "Subject") return entry.subjectName ?? "Subject";
  return entry.classroomName ?? "Classroom";
}

function describeChangedDates(entry: CalendarEntryDto): string | null {
  const c = entry.lastChange;
  if (!c) return null;
  const parts: string[] = [];
  if (c.previousStartDate && c.previousEndDate && c.newStartDate && c.newEndDate) {
    parts.push(
      `Was ${formatEntryRange(c.previousStartDate, c.previousEndDate)}, now ${formatEntryRange(c.newStartDate, c.newEndDate)}`,
    );
  }
  if (c.previousTitle && c.newTitle && c.previousTitle !== c.newTitle) {
    parts.push(`Was "${c.previousTitle}", now "${c.newTitle}"`);
  }
  return parts.length > 0 ? parts.join(". ") : null;
}

export function EntryCard({ entry, entryTypeLabel, onOpenDetail, onEdit, onDelete }: EntryCardProps) {
  const isPast = entry.status === "Past";
  const changeLine = describeChangedDates(entry);

  return (
    <li
      className={`rounded-xl border border-slate-200 p-3 ${isPast ? "bg-slate-50/70 opacity-75" : "bg-white"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpenDetail} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <EntryTypeBadge type={entry.entryType} label={entryTypeLabel} />
            {entry.lastChange && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">
                <History className="h-3 w-3" />
                Updated
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800" title={entry.title}>
            {entry.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{formatEntryRange(entry.startDate, entry.endDate)}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400" title={`${scopeLabel(entry)} · ${entry.createdByName}, ${entry.createdByRole}`}>
            {scopeLabel(entry)} · {entry.createdByName}, {entry.createdByRole}
          </p>
          {changeLine && (
            <p className="mt-1 text-[11px] text-violet-600">
              <span aria-hidden="true">{changeLine}</span>
              <span className="sr-only">{entry.lastChange?.message}</span>
            </p>
          )}
        </button>

        {entry.canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-slate-400 hover:text-slate-700" aria-label={`Entry actions for ${entry.title}`}>
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit entry
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDelete} className="text-rose-600 focus:text-rose-600">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete entry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}

export default EntryCard;
