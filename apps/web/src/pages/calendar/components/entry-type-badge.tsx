import { ClipboardList, Flag, GraduationCap, HelpCircle, Palmtree, Tag } from "lucide-react";
import type { CalendarEntryTypeKey } from "@/services/calendar";

// Entry type is never shown by icon/colour alone — every usage pairs this
// icon with the visible label text from the server's /entry-types list.
const STYLES: Record<CalendarEntryTypeKey, { icon: React.ReactNode; className: string }> = {
  Assessment: { icon: <ClipboardList className="h-3 w-3 shrink-0" />, className: "bg-indigo-50 text-indigo-700" },
  Quiz: { icon: <HelpCircle className="h-3 w-3 shrink-0" />, className: "bg-sky-50 text-sky-700" },
  MidTerm: { icon: <Flag className="h-3 w-3 shrink-0" />, className: "bg-amber-50 text-amber-700" },
  Exam: { icon: <GraduationCap className="h-3 w-3 shrink-0" />, className: "bg-rose-50 text-rose-700" },
  Holiday: { icon: <Palmtree className="h-3 w-3 shrink-0" />, className: "bg-emerald-50 text-emerald-700" },
  Other: { icon: <Tag className="h-3 w-3 shrink-0" />, className: "bg-slate-100 text-slate-600" },
};

export function entryTypeIcon(type: CalendarEntryTypeKey) {
  return (STYLES[type] ?? STYLES.Other).icon;
}

export function EntryTypeBadge({
  type,
  label,
  className = "",
}: {
  type: CalendarEntryTypeKey;
  /** The label from /entry-types — schools may rename these, never hard-code. */
  label: string;
  className?: string;
}) {
  const style = STYLES[type] ?? STYLES.Other;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${style.className} ${className}`}>
      {style.icon}
      {label}
    </span>
  );
}

export default EntryTypeBadge;
