import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import type { ParentChild } from "@/services/parent";
import { ChildrenGate } from "../component/ui/children-gate";
import { Skeleton } from "../component/ui/feedback";
import { PageHeader } from "../component/ui/panel";
import { stagger } from "../component/ui/motion";
import { childName } from "../lib/format";
import { useAttendanceHistory } from "../lib/hooks";
import { sortNewestFirst, summarizeAttendance } from "../lib/insights";
import { AttendanceHeatmap } from "./parts/attendance-heatmap";
import { HistoryList, type StatusFilter } from "./parts/history-list";
import { StatsPanel } from "./parts/stats-panel";
import { SubjectBreakdown } from "./parts/subject-breakdown";

const ParentAttendance = () => (
  <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
    <ChildrenGate
      skeleton={
        <>
          <Skeleton className="h-20 w-2/3 rounded-2xl" />
          <AttendanceSkeleton />
        </>
      }
    >
      {(child) => <AttendanceBody child={child} />}
    </ChildrenGate>
  </motion.div>
);

const isStatus = (v: string | null): v is StatusFilter => v === "all" || v === "present" || v === "absent";

/** Filters live in the URL so a dashboard link (or a refresh) lands on the same view. */
function useHistoryFilters() {
  const [params, setParams] = useSearchParams();
  const set = useCallback(
    (key: string, value: string | null, fallback: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!value || value === fallback) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const rawStatus = params.get("status");
  return {
    query: params.get("q") ?? "",
    status: isStatus(rawStatus) ? rawStatus : "all",
    day: params.get("day"),
    setQuery: (q: string) => set("q", q, ""),
    setStatus: (s: StatusFilter) => set("status", s, "all"),
    setDay: (d: string | null) => set("day", d, ""),
  };
}

function AttendanceBody({ child }: { child: ParentChild }) {
  const history = useAttendanceHistory(child.studentId);
  const sorted = useMemo(() => sortNewestFirst(history.data), [history.data]);
  const summary = useMemo(() => summarizeAttendance(sorted), [sorted]);
  const f = useHistoryFilters();
  const first = child.firstName || "your child";

  const pickDay = (d: string | null) => {
    f.setDay(d);
    if (d) document.getElementById("history")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <PageHeader
        eyebrow={childName(child)}
        title="Attendance"
        description={`How often ${first} has been present, and every session teachers have recorded.`}
      />

      <motion.div key={child.studentId} variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
          <StatsPanel child={child} />
          <AttendanceHeatmap days={summary.days} loading={history.loading} selectedDay={f.day} onSelectDay={pickDay} />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <HistoryList
              items={sorted}
              loading={history.loading}
              error={history.error}
              onRetry={history.reload}
              query={f.query}
              onQuery={f.setQuery}
              status={f.status}
              onStatus={f.setStatus}
              day={f.day}
              onDay={f.setDay}
              firstName={first}
            />
          </div>
          <div className="lg:col-span-4">
            <SubjectBreakdown
              subjects={summary.bySubject}
              loading={history.loading}
              activeQuery={f.query}
              onPick={f.setQuery}
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12" aria-busy="true" aria-label="Loading attendance">
      <Skeleton className="h-[420px] rounded-[20px] lg:col-span-5" />
      <Skeleton className="h-[420px] rounded-[20px] lg:col-span-7" />
      <Skeleton className="h-[520px] rounded-[20px] lg:col-span-8" />
      <Skeleton className="h-[320px] rounded-[20px] lg:col-span-4" />
    </div>
  );
}

export default ParentAttendance;
