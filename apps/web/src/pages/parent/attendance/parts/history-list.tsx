import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Search, SearchX, X } from "lucide-react";
import type { AttendanceHistoryItem } from "@/services/attendance";
import { Panel } from "../../component/ui/panel";
import { Button } from "../../component/ui/button";
import { EmptyState, ErrorState, Kbd, Skeleton } from "../../component/ui/feedback";
import { Segmented } from "../../component/ui/segmented";
import { SessionRow } from "../../component/ui/session-row";
import { quick } from "../../component/ui/motion";
import { dayLabel, toLocalIsoDate } from "../../lib/format";
import { sessionTitle } from "../../lib/insights";

export type StatusFilter = "all" | "present" | "absent";

interface HistoryListProps {
  items: AttendanceHistoryItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  query: string;
  onQuery: (q: string) => void;
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  day: string | null;
  onDay: (d: string | null) => void;
  firstName: string;
}

const PAGE = 25;

export function HistoryList({
  items,
  loading,
  error,
  onRetry,
  query,
  onQuery,
  status,
  onStatus,
  day,
  onDay,
  firstName,
}: HistoryListProps) {
  const [type, setType] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses search, as in most productivity tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || t?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const types = useMemo(
    () => [...new Set(items.map((i) => i.attendanceTypeName).filter(Boolean))].sort(),
    [items],
  );

  // Everything except the status filter, so status counts stay meaningful.
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (type !== "all" && i.attendanceTypeName !== type) return false;
      if (day && toLocalIsoDate(new Date(i.startedAt)) !== day) return false;
      if (!q) return true;
      return [sessionTitle(i), i.subTopicName, i.classroomName, i.attendanceTypeName]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [items, query, type, day]);

  const counts = useMemo(
    () => ({ all: base.length, present: base.filter((i) => i.isPresent).length, absent: base.filter((i) => !i.isPresent).length }),
    [base],
  );

  const filtered = useMemo(
    () => (status === "all" ? base : base.filter((i) => (status === "present" ? i.isPresent : !i.isPresent))),
    [base, status],
  );

  useEffect(() => setLimit(PAGE), [query, status, type, day]);

  const groups = useMemo(() => {
    const out: { label: string; rows: AttendanceHistoryItem[] }[] = [];
    for (const item of filtered.slice(0, limit)) {
      const label = dayLabel(new Date(item.startedAt));
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(item);
      else out.push({ label, rows: [item] });
    }
    return out;
  }, [filtered, limit]);

  const hasFilters = query !== "" || status !== "all" || type !== "all" || day !== null;
  const clearAll = () => {
    onQuery("");
    onStatus("all");
    setType("all");
    onDay(null);
  };

  return (
    <Panel id="history" className="scroll-mt-6">
      <div className="space-y-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="pp-eyebrow mb-1">Every recorded session</p>
            <h2 className="pp-display text-[17px] font-semibold text-(--pp-text)">History</h2>
          </div>
          {!loading && items.length > 0 && (
            <p className="pp-num pt-1 text-[12px] text-(--pp-subtle)" aria-live="polite">
              {filtered.length} of {items.length}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search sessions</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-(--pp-subtle)" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onQuery("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search subject, topic or class"
              className="pp-input pr-10 pl-10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-(--pp-subtle) hover:bg-(--pp-sunken)"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <Kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 text-(--pp-subtle) md:inline-flex">/</Kbd>
            )}
          </label>
          {types.length > 1 && (
            <label className="md:w-44">
              <span className="sr-only">Session type</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="pp-input">
                <option value="all">All session types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Filter by status"
            value={status}
            onChange={onStatus}
            size="sm"
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "present", label: "Present", count: counts.present },
              { value: "absent", label: "Absent", count: counts.absent },
            ]}
          />
          <AnimatePresence>
            {day && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={quick}
                onClick={() => onDay(null)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-(--pp-solid) px-3 text-[12px] font-semibold text-(--pp-solid-fg)"
                aria-label="Remove day filter"
              >
                {dayLabel(new Date(`${day}T00:00:00`))}
                <X className="size-3" />
              </motion.button>
            )}
          </AnimatePresence>
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="h-8 rounded-full px-2.5 text-[12px] font-semibold text-(--pp-iris) hover:bg-(--pp-iris-soft)"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-(--pp-line) pt-2 pb-3">
        {loading ? (
          <div className="space-y-4 px-5 py-3 sm:px-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3.5">
                <Skeleton className="size-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-5 py-3 sm:px-6">
            <ErrorState title="We couldn't load the history" message={error} onRetry={onRetry} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<History className="size-5" />}
            title="No sessions recorded yet"
            description={`When ${firstName}'s teachers take attendance, every session will be listed here.`}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title="No sessions match these filters"
            description={
              status === "absent" && !query && !day && type === "all"
                ? `${firstName} hasn't missed any recorded sessions.`
                : "Try a different search or clear the filters."
            }
            action={
              <Button variant="secondary" size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.label}>
                <p className="pp-eyebrow sticky top-14 z-10 lg:top-0 bg-(--pp-surface)/95 px-5 pt-3 pb-1 backdrop-blur sm:px-6">{g.label}</p>
                <ul>
                  {g.rows.map((item, i) => (
                    <SessionRow key={item.sessionId} item={item} connector={i < g.rows.length - 1} />
                  ))}
                </ul>
              </div>
            ))}
            {filtered.length > limit && (
              <div className="px-5 pt-3 sm:px-6">
                <Button variant="secondary" className="w-full" onClick={() => setLimit((l) => l + PAGE)}>
                  Show {Math.min(PAGE, filtered.length - limit)} more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
