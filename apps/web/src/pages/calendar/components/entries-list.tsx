import { useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import type { CalendarEntryDto } from "@/services/calendar";
import EntryCard from "./entry-card";

const COLLAPSED_COUNT = 3;

interface EntriesListProps {
  entries: CalendarEntryDto[];
  entryTypeLabels: Record<string, string>;
  canAdd: boolean;
  onAdd: () => void;
  onOpenDetail: (entry: CalendarEntryDto) => void;
  onEdit: (entry: CalendarEntryDto) => void;
  onDelete: (entry: CalendarEntryDto) => void;
}

export function EntriesList({ entries, entryTypeLabels, canAdd, onAdd, onOpenDetail, onEdit, onDelete }: EntriesListProps) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);
  const hiddenCount = sorted.length - visible.length;

  if (sorted.length === 0 && !canAdd) return null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">
          {sorted.length === 0 ? "No entries yet" : `Entries (${sorted.length})`}
        </span>
        {canAdd && (
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-[#4F61E8] hover:bg-[#4F61E8]/10" onClick={onAdd}>
            <Plus className="h-3 w-3" />
            Add entry
          </Button>
        )}
      </div>

      {sorted.length > 0 && (
        <ul className="space-y-2">
          {visible.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              entryTypeLabel={entryTypeLabels[entry.entryType] ?? entry.entryType}
              onOpenDetail={() => onOpenDetail(entry)}
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry)}
            />
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Show {hiddenCount} more {hiddenCount === 1 ? "entry" : "entries"}
        </button>
      )}
      {expanded && sorted.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Show fewer
        </button>
      )}
    </div>
  );
}

export default EntriesList;
