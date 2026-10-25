import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpenCheck, Check, Search, SearchX } from "lucide-react";
import type { TaughtTopic } from "@/services/parent-assessment";
import { cn } from "@/lib/utils";
import { Button } from "../../component/ui/button";
import { EmptyState, ErrorState, Skeleton } from "../../component/ui/feedback";
import { Segmented } from "../../component/ui/segmented";
import { fadeUp, stagger } from "../../component/ui/motion";
import { daysAgo, shortDate, toLocalIsoDate } from "../../lib/format";

export type RangePreset = "14" | "30" | "90" | "custom";

interface TopicsStepProps {
  firstName: string;
  preset: RangePreset;
  onPreset: (p: RangePreset) => void;
  fromDate: string;
  toDate: string;
  onFromDate: (v: string) => void;
  onToDate: (v: string) => void;
  topics: TaughtTopic[];
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

export const presetRange = (p: Exclude<RangePreset, "custom">) => ({
  from: toLocalIsoDate(daysAgo(Number(p))),
  to: toLocalIsoDate(new Date()),
});

export function TopicsStep(props: TopicsStepProps) {
  const { firstName, preset, fromDate, toDate, topics, searched, loading, error, selected } = props;
  const [filter, setFilter] = useState("");
  const ids = { from: useId(), to: useId(), err: useId() };
  const today = toLocalIsoDate(new Date());
  const rangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const map = new Map<string, TaughtTopic[]>();
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
          Pick a period. We'll list every topic teachers recorded as taught in it.
        </p>

        <div className="mt-5 space-y-4">
          <Segmented
            label="Taught in"
            value={preset}
            onChange={props.onPreset}
            size="sm"
            className="flex w-full sm:inline-flex sm:w-auto"
            options={[
              { value: "14", label: "2 weeks" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
              { value: "custom", label: "Custom" },
            ]}
          />

          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <label htmlFor={ids.from}>
                <span className="pp-eyebrow">From</span>
                <input
                  id={ids.from}
                  type="date"
                  value={fromDate}
                  max={toDate || today}
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
                  max={today}
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

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={props.onFind}
              loading={loading}
              disabled={rangeInvalid || !fromDate || !toDate}
              icon={<BookOpenCheck className="size-4" />}
            >
              {searched ? "Search again" : "Find taught topics"}
            </Button>
            <span className="pp-num text-[12px] text-(--pp-subtle)">
              {fromDate && toDate && !rangeInvalid
                ? `${shortDate(new Date(`${fromDate}T00:00:00`))} – ${shortDate(new Date(`${toDate}T00:00:00`))}`
                : ""}
            </span>
          </div>
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
            title="No taught topics in that period"
            description="Teachers may not have recorded lessons yet. Try a longer period, such as 90 days."
            action={
              preset !== "90" ? (
                <Button variant="secondary" size="sm" onClick={() => props.onPreset("90")}>
                  Use the last 90 days
                </Button>
              ) : undefined
            }
          />
        </section>
      )}

      {!loading && topics.length > 0 && (
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="pp-surface">
          <div className="flex flex-col gap-3 border-b border-(--pp-line) p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-[14px] font-semibold text-(--pp-text)">
                {topics.length} topic{topics.length === 1 ? "" : "s"} taught
              </p>
              <p className="text-[12px] text-(--pp-subtle)">Choose the ones to practise. You can pick across subjects.</p>
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
