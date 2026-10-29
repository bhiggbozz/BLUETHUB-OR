import { CalendarX2, EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Progress,
} from "@bluethub/ui-kit";
import type { CalendarEntryDto, CalendarTermDto } from "@/services/calendar";
import { currentWeekOf, formatDisplayRange, termLengthWeeks, todayISO } from "../utils";
import StatusChip from "./status-chip";
import EntriesList from "./entries-list";

interface TermCardProps {
  term: CalendarTermDto;
  canManage: boolean;
  onlyTermLeft: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteYearInstead: () => void;
  entries: CalendarEntryDto[];
  entryTypeLabels: Record<string, string>;
  canAddEntry: boolean;
  onAddEntry: () => void;
  onOpenEntryDetail: (entry: CalendarEntryDto) => void;
  onEditEntry: (entry: CalendarEntryDto) => void;
  onDeleteEntry: (entry: CalendarEntryDto) => void;
}

export function TermCard({
  term,
  canManage,
  onlyTermLeft,
  onEdit,
  onDelete,
  onDeleteYearInstead,
  entries,
  entryTypeLabels,
  canAddEntry,
  onAddEntry,
  onOpenEntryDetail,
  onEditEntry,
  onDeleteEntry,
}: TermCardProps) {
  const weeks = termLengthWeeks(term);
  const isCurrent = term.status === "Current";
  const progress = isCurrent ? currentWeekOf(term, todayISO()) : null;

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800" title={term.name}>
            {term.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{formatDisplayRange(term.startDate, term.endDate)}</p>
          <p className="mt-0.5 text-xs text-slate-400">{weeks} week{weeks !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <StatusChip status={term.status} />
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-700"
                  aria-label={`Term actions for ${term.name}`}
                >
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit term
                </DropdownMenuItem>
                {onlyTermLeft ? (
                  <DropdownMenuItem onSelect={onDeleteYearInstead} className="text-rose-600 focus:text-rose-600">
                    <CalendarX2 className="mr-2 h-3.5 w-3.5" />
                    Delete year instead
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={onDelete} className="text-rose-600 focus:text-rose-600">
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete term
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isCurrent && progress && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Week {progress.week} of {progress.total}</span>
            <span>{Math.round((progress.week / progress.total) * 100)}%</span>
          </div>
          <Progress value={(progress.week / progress.total) * 100} className="h-1.5 bg-slate-100" />
        </div>
      )}

      <EntriesList
        entries={entries}
        entryTypeLabels={entryTypeLabels}
        canAdd={canAddEntry}
        onAdd={onAddEntry}
        onOpenDetail={onOpenEntryDetail}
        onEdit={onEditEntry}
        onDelete={onDeleteEntry}
      />
    </li>
  );
}

export default TermCard;
