import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, UserCheck, UserX } from "lucide-react";
import type { ParentChild } from "@/services/parent";
import { ChildAvatar } from "../../component/ui/child-avatar";
import { AnimatedNumber, RateRing, rateTone } from "../../component/ui/data-viz";
import { fadeUp } from "../../component/ui/motion";
import { childName, monthKey } from "../../lib/format";
import { useAttendanceStats } from "../../lib/hooks";

const toneLabel = {
  present: "On track",
  warn: "Worth watching",
  absent: "Needs attention",
  neutral: "No sessions yet",
} as const;

/** Dark hero card: this month's attendance for the selected child, from the stats endpoint. */
export function SpotlightCard({ child }: { child: ParentChild }) {
  const month = monthKey(0);
  const stats = useAttendanceStats({
    studentId: child.studentId,
    classroomId: child.classroomId,
    fromMonth: month,
    toMonth: month,
    scope: "class",
  });

  const s = stats.data;
  const hasSessions = Boolean(s && s.sessions > 0);
  const rate = hasSessions && s ? s.attendanceRate : null;
  const tone = rateTone(rate);
  const monthName = new Date().toLocaleDateString(undefined, { month: "long" });

  return (
    <motion.section variants={fadeUp} className="pp-spotlight p-5 sm:p-7 lg:col-span-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <ChildAvatar id={child.studentId} firstName={child.firstName} lastName={child.lastName} size="lg" />
          <div className="min-w-0">
            <p className="pp-display truncate text-[20px] font-semibold text-white sm:text-[22px]">{childName(child)}</p>
            <p className="truncate text-[13px] text-white/60">{child.classroomName || "Class not set"}</p>
          </div>
        </div>
        <Link
          to="/parent/attendance"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-[12px] font-semibold text-white/90 transition-colors hover:bg-white/[0.12]"
        >
          Details <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-7 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        {stats.loading ? (
          <div className="size-[148px] shrink-0 animate-pulse rounded-full border-[12px] border-white/10 motion-reduce:animate-none" />
        ) : (
          <RateRing
            rate={rate}
            size={148}
            stroke={12}
            trackClassName="stroke-white/10"
            label={rate === null ? `No sessions recorded in ${monthName}` : `${rate}% attendance in ${monthName}`}
          >
            {rate === null ? (
              <span className="pp-num text-[30px] font-semibold text-white/40">—</span>
            ) : (
              <AnimatedNumber value={rate} suffix="%" className="text-[34px] font-semibold text-white" />
            )}
            <span className="mt-0.5 text-[11px] font-medium text-white/55">{monthName}</span>
          </RateRing>
        )}

        <div className="w-full min-w-0 flex-1">
          <p className="pp-eyebrow text-white/50!">Attendance this month</p>
          {stats.error ? (
            <p className="mt-2 text-[14px] text-white/80">
              We couldn't load this month's figures.{" "}
              <button type="button" onClick={stats.reload} className="font-semibold text-(--pp-glow) underline-offset-4 hover:underline">
                Try again
              </button>
            </p>
          ) : stats.loading ? (
            <div className="mt-3 space-y-2">
              <div className="h-5 w-40 rounded bg-white/10" />
              <div className="h-4 w-56 rounded bg-white/10" />
            </div>
          ) : (
            <>
              <p className="pp-display mt-1.5 text-[22px] font-semibold text-white">{toneLabel[tone]}</p>
              <p className="mt-1 text-[13px] leading-5 text-white/60">
                {hasSessions && s
                  ? `Present for ${s.presentCount} of ${s.sessions} class sessions so far.`
                  : `No class sessions have been recorded in ${monthName} yet.`}
              </p>
            </>
          )}

          <dl className="mt-5 grid grid-cols-3 gap-2">
            <MiniStat icon={<CalendarDays className="size-3.5" />} label="Sessions" value={s?.sessions} loading={stats.loading} />
            <MiniStat icon={<UserCheck className="size-3.5" />} label="Present" value={s?.presentCount} loading={stats.loading} accent="text-emerald-300" />
            <MiniStat icon={<UserX className="size-3.5" />} label="Absent" value={s?.absentCount} loading={stats.loading} accent="text-rose-300" />
          </dl>
        </div>
      </div>
    </motion.section>
  );
}

function MiniStat({
  icon,
  label,
  value,
  loading,
  accent = "text-white/70",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  loading: boolean;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
      <dt className={`flex items-center gap-1.5 text-[11px] font-medium ${accent}`}>
        {icon}
        {label}
      </dt>
      <dd className="mt-1">
        {loading ? (
          <span className="block h-6 w-8 rounded bg-white/10" />
        ) : value === undefined ? (
          <span className="pp-num text-[20px] font-semibold text-white/35" aria-label="Not available">—</span>
        ) : (
          <AnimatedNumber value={value} className="text-[20px] font-semibold text-white" />
        )}
      </dd>
    </div>
  );
}
