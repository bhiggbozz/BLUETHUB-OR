import { CheckCircle2, Clock3 } from "lucide-react";
import type { CalendarSessionStatus } from "@/services/calendar";

// Status is never shown by colour alone — each chip pairs a distinct icon,
// label text, and fill pattern (solid / dashed outline / light grey) so it
// still reads correctly for colour-blind users or in greyscale.
const STYLES: Record<CalendarSessionStatus, { label: string; className: string; icon: React.ReactNode }> = {
  Current: {
    label: "Current",
    className: "bg-emerald-600 text-white border border-emerald-600",
    icon: <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 motion-reduce:animate-none" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>,
  },
  Upcoming: {
    label: "Upcoming",
    className: "bg-amber-50 text-amber-700 border-2 border-dashed border-amber-400",
    icon: <Clock3 className="h-3 w-3 shrink-0" />,
  },
  Past: {
    label: "Past",
    className: "bg-slate-100 text-slate-500 border border-slate-200",
    icon: <CheckCircle2 className="h-3 w-3 shrink-0" />,
  },
};

export function StatusChip({ status, className = "" }: { status: CalendarSessionStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className} ${className}`}
    >
      {style.icon}
      {style.label}
    </span>
  );
}

export default StatusChip;
