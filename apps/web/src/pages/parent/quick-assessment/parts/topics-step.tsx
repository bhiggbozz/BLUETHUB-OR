import { useMemo, useState } from "react";
import { useId } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpenCheck, Check, RefreshCw, Search, SearchX } from "lucide-react";
import type { TaughtTopic } from "@/services/parent-assessment";
import type { CalendarTermDto } from "@/services/calendar";
import { cn } from "@/lib/utils";
import { Button } from "../../component/ui/button";
import { EmptyState, ErrorState, Skeleton } from "../../component/ui/feedback";
import { Segmented } from "../../component/ui/segmented";
import { fadeUp, stagger } from "../../component/ui/motion";
import { shortDate } from "../../lib/format";

/** A topic a teacher logged as "taught" doesn't guarantee it has any bank
 * questions yet — this is what's left after the caller checks each one and
 * drops the ones with nothing available. */
export interface TaughtTopicWithAvailability extends TaughtTopic {
  availableCount: number;
}

interface TopicsStepProps {
  firstName: string;
  // Term picker — only shown once the school's calendar has resolved.
  calendarLoading: boolean;
  hasCalendar: boolean;
  terms: CalendarTermDto[];
  selectedTermId: string | null;
  onSelectTerm: (termId: string) => void;
  // The range actually in effect — a term's dates when hasCalendar, or a
  // parent-entered custom pair (via onFromDate/onToDate) otherwise.
  fromDate: string;
  toDate: string;
  onFromDate: (v: string) => void;
  onToDate: (v: string) => void;
  topics: TaughtTopicWithAvailability[];
  // Taught topics that were checked and dropped for having zero bank
  // questions — shown as a note so "taught but not pickable" isn't silent.
  hiddenCount: number;
  searched: boolean;
  loading: boolean;
  error: string | null;
  onFind: () => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], on: boolean) => void;
  onContinue: () => void;
  continuing: boolean;
  continueError: string | null;
}

export function TopicsStep(props: TopicsStepProps) {
  const {
    firstName, calendarLoading, hasCalendar, terms, selectedTermId,
    fromDate, toDate, topics, searched, loading, error, selected,
  } = props;
  const [filter, setFilter] = useState("");
  const ids = { from: useId(), to: useId(), err: useId() };
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const rangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  const termOptions = useMemo(
    () =>
      terms.map((t) => ({
        value: t.id,
        label: t.status === "Current" ? `${t.name} (current)` : t.name,
      })),
    [terms],
  );

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const map = new Map<string, TaughtTopicWithAvailability[]>();
    for (const t of topics) {
      if (q && !`${t.topicName} ${t.subjectName}`.toLowerCase().includes(q)) continue;
      const list = map.get(t.subjectName) ?? [];
      list.push(t);
      map.set(t.subjectName, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [topics, filter]);

  return (
    <div className="space-y-5">
      <section className="pp-surface p-5 sm:p-6">
        <p className="pp-eyebrow">Step 1</p>
        <h2 className="pp-display mt-1 text-[19px] font-semibold text-(--pp-text)">What has {firstName} been taught?</h2>
        <p className="mt-1 text-[13px] leading-5 text-(--pp-muted)">
          {hasCalendar
            ? "Defaults to the current term. Switch terms to look further back."
            : "Pick a period. We'll list every topic teachers recorded as taught in it."}
        </p>

        <div className="mt-5 space-y-4">
          {calendarLoading ? (
            <Skeleton className="h-9 w-64 rounded-xl" />
          ) : hasCalendar ? (
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                label="Term"
                value={selectedTermId ?? ""}
                onChange={props.onSelectTerm}
                size="sm"
                className="flex w-full sm:inline-flex sm:w-auto"
                options={termOptions}
              />
              <button
                type="button"
                onClick={props.onFind}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-(--pp-iris) hover:bg-(--pp-iris-soft) disabled:opacity-50"
                title="Refresh taught topics for this term"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <label htmlFor={ids.from}>
                <span className="pp-eyebrow">From</span>
                <input
                  id={ids.from}
                  type="date"
                  value={fromDate}
                  max={toDate || todayIso}
                  onChange={(e) => props.onFromDate(e.target.value)}
                  aria-invalid={rangeInvalid}
                  aria-describedby={rangeInvalid ? ids.err : undefined}
                  className="pp-input mt-1.5"
                />
              </label>
              <label htmlFor={ids.to}>
                <span className="pp-eyebrow">To</span>
                <input
                  id={ids.to}
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={todayIso}
                  onChange={(e) => props.onToDate(e.target.value)}
                  aria-invalid={rangeInvalid}
                  aria-describedby={rangeInvalid ? ids.err : undefined}
                  className="pp-input mt-1.5"
                />
              </label>
              {rangeInvalid && (
                <p id={ids.err} className="col-span-2 text-[12px] font-medium text-(--pp-absent)">
                  The start date must be on or before the end date.
                </p>
              )}
            </div>
          )}

          {!hasCalendar && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={props.onFind}
                loading={loading}
                disabled={rangeInvalid || !fromDate || !toDate}
                icon={<BookOpenCheck className="size-4" />}
              >
                {searched ? "Search again" : "Find taught topics"}
              </Button>
            </div>
          )}

          {fromDate && toDate && (
            <span className="pp-num block text-[12px] text-(--pp-subtle)">
              {shortDate(new Date(`${fromDate}T00:00:00`))} – {shortDate(new Date(`${toDate}T00:00:00`))}
            </span>
          )}
        </div>
      </section>

      {error && <ErrorState title="We couldn't load taught topics" message={error} onRetry={props.onFind} />}

      {loading && (
        <section className="pp-surface space-y-3 p-5 sm:p-6" aria-busy="true">
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-wrap gap-2">
            {["w-40", "w-28", "w-52", "w-36", "w-44", "w-32"].map((w, i) => (
              <Skeleton key={i} className={`h-11 rounded-xl ${w}`} />
            ))}
          </div>
        </section>
      )}

      {!loading && searched && topics.length === 0 && !error && (
        <section className="pp-surface">
          <EmptyState
            icon={<SearchX className="size-5" />}
            title={props.hiddenCount > 0 ? "Nothing ready to practise yet" : "No taught topics in that period"}
            description={
              props.hiddenCount > 0
                ? `${props.hiddenCount} topic${props.hiddenCount === 1 ? "" : "s"} ${props.hiddenCount === 1 ? "was" : "were"} taught, but none have practice questions banked yet.`
                : hasCalendar
                  ? "Teachers may not have recorded lessons yet this term. Try an earlier term."
                  : "Teachers may not have recorded lessons yet. Try a longer period."
            }
          />
        </section>
      )}

      {!loading && topics.length > 0 && (
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="pp-surface">
          <div className="flex flex-col gap-3 border-b border-(--pp-line) p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-[14px] font-semibold text-(--pp-text)">
                {topics.length} topic{topics.length === 1 ? "" : "s"} ready to practise
              </p>
              <p className="text-[12px] text-(--pp-subtle)">Choose the ones to practise. You can pick across subjects.</p>
              {props.hiddenCount > 0 && (
                <p className="mt-1 text-[11px] text-(--pp-subtle)">
                  {props.hiddenCount} other topic{props.hiddenCount === 1 ? "" : "s"} taught this period{" "}
                  {props.hiddenCount === 1 ? "doesn't" : "don't"} have questions banked yet, so {props.hiddenCount === 1 ? "it isn't" : "they aren't"} shown.
                </p>
              )}
            </div>
            {topics.length > 6 && (
              <label className="relative sm:w-60">
                <span className="sr-only">Filter topics</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--pp-subtle)" />
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter topics"
                  className="pp-input h-10 pl-9"
                />
              </label>
            )}
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {grouped.length === 0 && (
              <p className="py-6 text-center text-[13px] text-(--pp-muted)">No topics match “{filter}”.</p>
            )}
            {grouped.map(([subject, list]) => {
              const allOn = list.every((t) => selected.has(t.topicId));
              return (
                <div key={subject}>
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <p className="pp-eyebrow">{subject}</p>
                    <button
                      type="button"
                      onClick={() => props.onSetMany(list.map((t) => t.topicId), !allOn)}
                      className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-(--pp-iris) hover:bg-(--pp-iris-soft)"
                    >
                      {allOn ? "Clear" : "Select all"}
                    </button>
                  </div>
                  <motion.div variants={stagger(0.02)} initial="hidden" animate="show" className="grid gap-2 sm:grid-cols-2">
                    {list.map((t) => {
                      const on = selected.has(t.topicId);
                      return (
                        <motion.button
                          key={t.topicId}
                          variants={fadeUp}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => props.onToggle(t.topicId)}
                          className={cn(
                            "group flex items-center gap-3 rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-150",
                            on
                              ? "border-(--pp-iris) bg-(--pp-iris-soft) shadow-[0_0_0_3px_rgba(75,68,224,0.12)]"
                              : "border-(--pp-line) hover:border-(--pp-line-strong) hover:bg-(--pp-sunken)",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                              on ? "border-(--pp-iris) bg-(--pp-iris) text-white" : "border-(--pp-line-strong) bg-(--pp-surface)",
                            )}
                          >
                            {on && <Check className="size-3.5" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-(--pp-text)">{t.topicName}</span>
                            <span className="block truncate text-[11px] text-(--pp-subtle)">
                              Taught {t.timesTaught}× · last on {shortDate(new Date(t.lastTaughtDate))}
                            </span>
                          </span>
                          <span className="pp-num shrink-0 text-[11px] text-(--pp-subtle)">
                            {t.availableCount} question{t.availableCount === 1 ? "" : "s"}
                          </span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-(--pp-line) p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="text-[13px] text-(--pp-muted)" aria-live="polite">
              {selected.size === 0 ? "Select at least one topic to continue." : `${selected.size} selected`}
            </p>
            <Button
              onClick={props.onContinue}
              disabled={selected.size === 0}
              loading={props.continuing}
              trailing={<ArrowRight className="size-4" />}
              className="w-full sm:w-auto"
            >
              Continue
            </Button>
          </div>
          {props.continueError && (
            <div className="px-5 pb-5 sm:px-6">
              <ErrorState title="We couldn't check question availability" message={props.continueError} onRetry={props.onContinue} />
            </div>
          )}
        </motion.section>
      )}
    </div>
  );
}
