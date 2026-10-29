import { useMemo } from "react";
import { format } from "date-fns";
import type { CalendarEntryDto, CalendarSessionDto } from "@/services/calendar";
import {
  compareISO,
  daysInclusive,
  findGaps,
  formatDisplayRange,
  isWithinInclusive,
  parseLocalDate,
  todayISO,
} from "../utils";

type Segment =
  | { kind: "term"; startDate: string; endDate: string; name: string; status: CalendarSessionDto["status"] }
  | { kind: "gap"; startDate: string; endDate: string; weeks: number };

const TERM_FILL: Record<CalendarSessionDto["status"], string> = {
  Current: "bg-emerald-500",
  Upcoming: "bg-amber-200 bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(217,153,0,0.35)_4px,rgba(217,153,0,0.35)_8px)]",
  Past: "bg-slate-200",
};

function useSegments(session: CalendarSessionDto): Segment[] {
  return useMemo(() => {
    const terms: Segment[] = [...session.terms]
      .sort((a, b) => compareISO(a.startDate, b.startDate))
      .map((t) => ({ kind: "term", startDate: t.startDate, endDate: t.endDate, name: t.name, status: t.status }));
    const gaps: Segment[] = findGaps(session.terms).map((g) => ({ kind: "gap", startDate: g.startDate, endDate: g.endDate, weeks: g.weeks }));
    return [...terms, ...gaps].sort((a, b) => compareISO(a.startDate, b.startDate));
  }, [session]);
}

function useMonthTicks(session: CalendarSessionDto) {
  return useMemo(() => {
    const totalDays = daysInclusive(session.startDate, session.endDate);
    const start = parseLocalDate(session.startDate);
    const end = parseLocalDate(session.endDate);
    const ticks: { leftPct: number; label: string }[] = [];

    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    if (cursor < start) cursor.setMonth(cursor.getMonth() + 1);

    while (cursor <= end) {
      const offsetDays = daysInclusive(session.startDate, format(cursor, "yyyy-MM-dd")) - 1;
      ticks.push({
        leftPct: (offsetDays / totalDays) * 100,
        label: cursor.getMonth() === 0 ? format(cursor, "MMM yyyy") : format(cursor, "MMM"),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return ticks;
  }, [session]);
}

function EntryBands({ session, entries }: { session: CalendarSessionDto; entries: CalendarEntryDto[] }) {
  const totalDays = daysInclusive(session.startDate, session.endDate);
  if (entries.length === 0) return null;

  return (
    <div className="relative mt-1 h-2">
      {entries.map((entry) => {
        const leftPct = ((daysInclusive(session.startDate, entry.startDate) - 1) / totalDays) * 100;
        const widthPct = Math.max((daysInclusive(entry.startDate, entry.endDate) / totalDays) * 100, 0.6);
        const label = entry.isAdminEntry ? "School" : entry.subjectName ?? entry.classroomName ?? entry.title;
        return (
          <div
            key={entry.id}
            title={`${entry.title} · ${label}`}
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            className={[
              "absolute top-0 rounded-sm",
              entry.isAdminEntry ? "h-2 bg-slate-600" : "h-1.5 top-[1px] bg-indigo-400",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

function HorizontalTimeline({ session, entries }: { session: CalendarSessionDto; entries: CalendarEntryDto[] }) {
  const segments = useSegments(session);
  const monthTicks = useMonthTicks(session);
  const totalDays = daysInclusive(session.startDate, session.endDate);
  const today = todayISO();
  const showToday = isWithinInclusive(today, session.startDate, session.endDate);
  const todayPct = showToday ? ((daysInclusive(session.startDate, today) - 1) / totalDays) * 100 : 0;

  return (
    <div aria-hidden="true" className="hidden sm:block select-none">
      <div className="relative">
        <div className="flex h-7 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-50">
          {segments.map((seg, i) => {
            const widthPct = (daysInclusive(seg.startDate, seg.endDate) / totalDays) * 100;
            const isGap = seg.kind === "gap";
            return (
              <div
                key={`${seg.kind}-${seg.startDate}-${i}`}
                style={{ width: `${widthPct}%` }}
                title={isGap ? `Break, ${seg.weeks} week${seg.weeks !== 1 ? "s" : ""}` : `${seg.name}`}
                className={[
                  "flex h-full items-center justify-center border-r border-white/60 last:border-r-0 overflow-hidden",
                  isGap ? "bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_4px,#e2e8f0_4px,#e2e8f0_8px)]" : TERM_FILL[seg.status],
                ].join(" ")}
              >
                {widthPct > 10 && (
                  <span className={`truncate px-1.5 text-[10px] font-semibold ${isGap ? "text-slate-500" : seg.status === "Upcoming" ? "text-amber-800" : "text-white"}`}>
                    {isGap ? `Break, ${seg.weeks}w` : seg.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {showToday && (
          <div className="absolute top-0 h-7" style={{ left: `${todayPct}%` }}>
            <div className="h-7 w-0.5 bg-[#4F61E8]" />
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-[#4F61E8] px-1.5 py-0.5 text-[9px] font-bold text-white whitespace-nowrap">
              Today
            </div>
          </div>
        )}
      </div>

      <EntryBands session={session} entries={entries} />

      {/* Month ticks */}
      <div className="relative mt-1.5 h-4">
        {monthTicks.map((tick, i) => (
          <span
            key={i}
            style={{ left: `${tick.leftPct}%` }}
            className="absolute -translate-x-1/2 text-[10px] font-medium text-slate-400"
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function VerticalStepper({ session }: { session: CalendarSessionDto }) {
  const segments = useSegments(session);
  const today = todayISO();

  return (
    <div aria-hidden="true" className="sm:hidden select-none">
      <ol className="relative ml-2 space-y-0 border-l-2 border-slate-200 pl-4">
        {segments.map((seg, i) => {
          if (seg.kind === "gap") {
            return (
              <li key={`gap-${i}`} className="relative py-2">
                <span className="absolute -left-[21px] top-3 h-2 w-2 rounded-full border-2 border-slate-300 bg-white" />
                <p className="text-xs font-medium text-slate-400">Break, {seg.weeks} week{seg.weeks !== 1 ? "s" : ""}</p>
              </li>
            );
          }
          const isToday = isWithinInclusive(today, seg.startDate, seg.endDate);
          return (
            <li key={`term-${i}`} className="relative py-2">
              <span
                className={[
                  "absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border-2",
                  seg.status === "Current" ? "border-emerald-500 bg-emerald-500" : seg.status === "Upcoming" ? "border-amber-400 bg-white" : "border-slate-300 bg-slate-200",
                ].join(" ")}
              />
              <p className="text-xs font-semibold text-slate-700">{seg.name}</p>
              <p className="text-[11px] text-slate-400">{formatDisplayRange(seg.startDate, seg.endDate)}</p>
              {isToday && <p className="mt-0.5 text-[10px] font-bold text-[#4F61E8]">Today</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function YearTimeline({ session, entries = [] }: { session: CalendarSessionDto; entries?: CalendarEntryDto[] }) {
  if (session.terms.length === 0) return null;
  return (
    <div>
      <HorizontalTimeline session={session} entries={entries} />
      <VerticalStepper session={session} />
    </div>
  );
}

export default YearTimeline;
