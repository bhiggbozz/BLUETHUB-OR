import { Fragment, useMemo } from "react";
import { motion } from "framer-motion";
import { Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "../../component/ui/panel";
import { Skeleton } from "../../component/ui/feedback";
import type { DayBucket } from "../../lib/insights";
import { startOfDay, toLocalIsoDate } from "../../lib/format";

const WEEKS = 12;
const ROW_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

interface HeatmapProps {
  days: Map<string, DayBucket>;
  loading: boolean;
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
}

type CellState = "none" | "present" | "partial" | "absent" | "future";

const cellCls: Record<CellState, string> = {
  none: "bg-(--pp-line)/60",
  future: "bg-transparent border border-dashed border-(--pp-line)",
  present: "bg-(--pp-present) shadow-[0_0_8px_-1px_rgba(12,143,99,0.55)]",
  partial: "bg-(--pp-warn)",
  absent: "bg-(--pp-absent)",
};

function stateOf(b: DayBucket | undefined, isFuture: boolean): CellState {
  if (isFuture) return "future";
  if (!b || b.total === 0) return "none";
  if (b.present === b.total) return "present";
  if (b.present === 0) return "absent";
  return "partial";
}

/** 12-week calendar. Each column is a week (Mon–Sun); clicking a day filters the history. */
export function AttendanceHeatmap({ days, loading, selectedDay, onSelectDay }: HeatmapProps) {
  const columns = useMemo(() => {
    const today = startOfDay(new Date());
    const mondayOffset = (today.getDay() + 6) % 7;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - mondayOffset);
    const cols: { date: Date; key: string; future: boolean }[][] = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(thisMonday);
        date.setDate(thisMonday.getDate() - w * 7 + d);
        col.push({ date, key: toLocalIsoDate(date), future: date.getTime() > today.getTime() });
      }
      cols.push(col);
    }
    return cols;
  }, []);

  const counts = useMemo(() => {
    let sessions = 0;
    let missedDays = 0;
    for (const col of columns)
      for (const c of col) {
        const b = days.get(c.key);
        if (!b) continue;
        sessions += b.total;
        if (b.present < b.total) missedDays += 1;
      }
    return { sessions, missedDays };
  }, [columns, days]);

  return (
    <Panel className="flex flex-col lg:col-span-7">
      <PanelHeader
        icon={<Grid3x3 className="size-4" />}
        eyebrow="Last 12 weeks"
        title="Day by day"
        description={
          loading
            ? "Loading recorded sessions…"
            : counts.sessions === 0
              ? "No sessions were recorded in the last 12 weeks."
              : `${counts.sessions} sessions recorded. ${counts.missedDays === 0 ? "No missed days." : `${counts.missedDays} day${counts.missedDays === 1 ? "" : "s"} with an absence.`} Select a day to filter the history.`
        }
      />

      <div className="flex-1 px-5 pt-5 pb-5 sm:px-6">
        {loading ? (
          <Skeleton className="aspect-[12/7] w-full max-w-[460px] rounded-2xl" />
        ) : (
          <div
            role="group"
            aria-label="Attendance calendar, last 12 weeks"
            className="grid max-w-[460px] gap-[4px] sm:gap-[5px]"
            style={{ gridTemplateColumns: `auto repeat(${WEEKS}, minmax(0, 1fr))` }}
          >
            <span />
            {columns.map((col, ci) => {
              const first = col[0].date;
              const showMonth = ci === 0 || first.getDate() <= 7;
              return (
                <span key={col[0].key} className="h-4 overflow-visible text-[10px] font-medium whitespace-nowrap text-(--pp-subtle)">
                  {showMonth ? first.toLocaleDateString(undefined, { month: "short" }) : ""}
                </span>
              );
            })}
            {ROW_LABELS.map((rowLabel, ri) => (
              <Fragment key={ri}>
                <span className="flex items-center pr-1.5 text-[10px] font-medium text-(--pp-subtle)">{rowLabel}</span>
                {columns.map((col, ci) => {
                  const cell = col[ri];
                  const b = days.get(cell.key);
                  const st = stateOf(b, cell.future);
                  const selected = selectedDay === cell.key;
                  const label = `${cell.date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}: ${
                    cell.future ? "upcoming" : b ? `present ${b.present} of ${b.total}` : "no sessions"
                  }`;
                  const clickable = Boolean(b) && !cell.future;
                  return (
                    <motion.button
                      key={cell.key}
                      type="button"
                      disabled={!clickable}
                      onClick={() => onSelectDay(selected ? null : cell.key)}
                      aria-label={label}
                      aria-pressed={selected}
                      title={label}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, delay: (ci * 7 + ri) * 0.003 }}
                      className={cn(
                        "aspect-square w-full max-w-9 rounded-[22%] transition-transform",
                        cellCls[st],
                        clickable && "cursor-pointer hover:scale-115",
                        selected && "ring-2 ring-(--pp-text) ring-offset-2 ring-offset-(--pp-surface)",
                      )}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-(--pp-muted)">
          <Legend cls={cellCls.present} label="All present" />
          <Legend cls={cellCls.partial} label="Some missed" />
          <Legend cls={cellCls.absent} label="All missed" />
          <Legend cls={cellCls.none} label="No session" />
        </div>
      </div>
    </Panel>
  );
}

const Legend = ({ cls, label }: { cls: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={cn("size-3 rounded-[4px]", cls)} />
    {label}
  </span>
);
