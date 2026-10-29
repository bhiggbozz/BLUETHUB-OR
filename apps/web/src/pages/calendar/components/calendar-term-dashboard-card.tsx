import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import calendarService, { type CalendarEntryDto, type CalendarSessionDto, type CalendarTermDto } from "@/services/calendar";
import { compareISO, currentWeekOf, daysUntil, todayISO } from "../utils";

/**
 * Small "what's happening this term" teaser for the student/parent dashboard.
 * Hides itself entirely when the school has no published calendar yet.
 */
export function CalendarTermDashboardCard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<CalendarSessionDto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [nextEntry, setNextEntry] = useState<CalendarEntryDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    calendarService
      .getCurrentSession()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data ?? null;
        setSession(data);
        if (!data) return;
        // Best-effort teaser — if this 403s for the caller's role, just skip it.
        calendarService
          .getEntries({ from: todayISO(), to: data.endDate })
          .then((entriesRes) => {
            if (cancelled) return;
            const upcoming = (entriesRes.data?.data ?? [])
              .filter((e) => e.status !== "Past")
              .sort((a, b) => compareISO(a.startDate, b.startDate))[0];
            setNextEntry(upcoming ?? null);
          })
          .catch(() => {
            if (!cancelled) setNextEntry(null);
          });
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !session) return null;

  const today = todayISO();
  const currentTerm = session.terms.find((t) => t.status === "Current");
  const upcomingTerm = session.terms
    .filter((t) => t.status === "Upcoming")
    .sort((a, b) => compareISO(a.startDate, b.startDate))[0];

  const term: CalendarTermDto | undefined = currentTerm ?? upcomingTerm;
  if (!term) return null;

  const detail = currentTerm
    ? (() => {
        const { week, total } = currentWeekOf(term, today);
        const daysLeft = daysUntil(today, term.endDate);
        return `Week ${week} of ${total} · ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
      })()
    : (() => {
        const daysToStart = daysUntil(today, term.startDate);
        return `Starts in ${daysToStart} day${daysToStart !== 1 ? "s" : ""}`;
      })();

  return (
    <button
      type="button"
      onClick={() => navigate("/calendar")}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#4F61E8]/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4F61E8]/10">
        <CalendarDays className="h-5 w-5 text-[#4F61E8]" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{term.name}</p>
        <p className="text-xs text-slate-500">{detail}</p>
        {nextEntry && (
          <p className="mt-0.5 truncate text-xs text-[#4F61E8]">
            {nextEntry.title} {nextEntry.status === "Current" ? "is on now" : `starts in ${daysUntil(today, nextEntry.startDate)} day${daysUntil(today, nextEntry.startDate) !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>
    </button>
  );
}

export default CalendarTermDashboardCard;
