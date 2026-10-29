import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CalendarRange, UserCheck, UserX } from "lucide-react";
import type { ParentChild } from "@/services/parent";
import { Panel, PanelHeader } from "../../component/ui/panel";
import { EmptyState, ErrorState, Skeleton } from "../../component/ui/feedback";
import { Segmented } from "../../component/ui/segmented";
import { AnimatedNumber, Meter, RateRing } from "../../component/ui/data-viz";
import { quick } from "../../component/ui/motion";
import { monthKey } from "../../lib/format";
import { useAttendanceStats, useClassroomSubjects } from "../../lib/hooks";

type Preset = "1" | "3" | "6" | "custom";
type Scope = "class" | "subject";

const short = (compact: string, full: string) => (
  <>
    <span className="sm:hidden">{compact}</span>
    <span className="hidden sm:inline">{full}</span>
  </>
);

const PRESETS: { value: Preset; label: React.ReactNode }[] = [
  { value: "1", label: short("Month", "This month") },
  { value: "3", label: short("3 mo", "3 months") },
  { value: "6", label: short("6 mo", "6 months") },
  { value: "custom", label: "Custom" },
];

export function StatsPanel({ child }: { child: ParentChild }) {
  const [preset, setPreset] = useState<Preset>("3");
  const [fromMonth, setFromMonth] = useState(monthKey(2));
  const [toMonth, setToMonth] = useState(monthKey(0));
  const [scope, setScope] = useState<Scope>("class");
  const [subjectId, setSubjectId] = useState("");
  const ids = { from: useId(), to: useId(), subject: useId(), err: useId() };

  const { subjects, loading: subjectsLoading } = useClassroomSubjects(child.classroomId);

  useEffect(() => {
    if (subjectId && !subjects.some((s) => s.id === subjectId)) setSubjectId("");
  }, [subjects, subjectId]);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      setFromMonth(monthKey(Number(p) - 1));
      setToMonth(monthKey(0));
    }
  };

  const rangeInvalid = fromMonth !== "" && toMonth !== "" && fromMonth > toMonth;
  const stats = useAttendanceStats({
    studentId: child.studentId,
    classroomId: child.classroomId,
    fromMonth,
    toMonth,
    scope,
    subjectId,
  });
  const s = stats.data;

  return (
    <Panel className="flex flex-col lg:col-span-5">
      <PanelHeader icon={<CalendarRange className="size-4" />} eyebrow="Attendance rate" title="For a period you choose" />

      <div className="space-y-4 px-5 pt-5 sm:px-6">
        <Segmented label="Period" value={preset} onChange={choosePreset} options={PRESETS} size="sm" className="flex w-full" />

        <AnimatePresence initial={false}>
          {preset === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={quick}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-3 pt-0.5">
                <label htmlFor={ids.from} className="block">
                  <span className="pp-eyebrow">From</span>
                  <input
                    id={ids.from}
                    type="month"
                    value={fromMonth}
                    max={monthKey(0)}
                    onChange={(e) => setFromMonth(e.target.value)}
                    aria-invalid={rangeInvalid}
                    aria-describedby={rangeInvalid ? ids.err : undefined}
                    className="pp-input mt-1.5"
                  />
                </label>
                <label htmlFor={ids.to} className="block">
                  <span className="pp-eyebrow">To</span>
                  <input
                    id={ids.to}
                    type="month"
                    value={toMonth}
                    max={monthKey(0)}
                    onChange={(e) => setToMonth(e.target.value)}
                    aria-invalid={rangeInvalid}
                    aria-describedby={rangeInvalid ? ids.err : undefined}
                    className="pp-input mt-1.5"
                  />
                </label>
              </div>
              {rangeInvalid && (
                <p id={ids.err} className="mt-2 text-[12px] font-medium text-(--pp-absent)">
                  The start month must be on or before the end month.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Segmented
            label="Scope"
            value={scope}
            onChange={setScope}
            options={[
              { value: "class", label: "Whole class" },
              { value: "subject", label: "One subject" },
            ]}
            size="sm"
          />
          {scope === "subject" && (
            <label htmlFor={ids.subject} className="min-w-0 flex-1">
              <span className="sr-only">Subject</span>
              <select
                id={ids.subject}
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={subjectsLoading || subjects.length === 0}
                className="pp-input h-10"
              >
                <option value="">
                  {subjectsLoading ? "Loading subjects…" : subjects.length === 0 ? "No subjects found" : "Choose a subject"}
                </option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="flex-1 px-5 pt-5 pb-5 sm:px-6" aria-live="polite">
        {rangeInvalid ? null : scope === "subject" && !subjectId ? (
          <EmptyState
            compact
            icon={<BookOpen className="size-5" />}
            title="Pick a subject"
            description="Choose one above to see its attendance rate for this period."
          />
        ) : stats.loading ? (
          <div className="flex items-center gap-5">
            <Skeleton className="size-[112px] rounded-full" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : stats.error ? (
          <ErrorState title="We couldn't load the rate" message={stats.error} onRetry={stats.reload} />
        ) : s ? (
          <div className="rounded-2xl bg-(--pp-sunken) p-4">
            <div className="flex items-center gap-5">
              <RateRing rate={s.sessions > 0 ? s.attendanceRate : null} size={112} stroke={10}>
                {s.sessions > 0 ? (
                  <AnimatedNumber value={s.attendanceRate} suffix="%" className="text-[26px] font-semibold text-(--pp-text)" />
                ) : (
                  <span className="pp-num text-[22px] text-(--pp-faint)">—</span>
                )}
              </RateRing>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-(--pp-text)">{s.periodLabel}</p>
                <p className="mt-0.5 truncate text-[12px] text-(--pp-subtle)">
                  {s.attendanceTypeName} · {s.subjectName ?? s.classroomName ?? child.classroomName}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                  <span className="inline-flex items-center gap-1.5 text-(--pp-present)">
                    <UserCheck className="size-4" />
                    <AnimatedNumber value={s.presentCount} className="font-semibold" /> present
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-(--pp-absent)">
                    <UserX className="size-4" />
                    <AnimatedNumber value={s.absentCount} className="font-semibold" /> absent
                  </span>
                </div>
              </div>
            </div>
            {s.sessions > 0 ? (
              <div className="mt-4">
                <Meter value={s.attendanceRate} />
                <p className="mt-2 text-[12px] text-(--pp-subtle)">
                  Across <span className="pp-num font-semibold text-(--pp-text)">{s.sessions}</span> recorded sessions.
                  90% or more is generally considered good.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-[12px] text-(--pp-subtle)">No sessions were recorded in this period.</p>
            )}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
