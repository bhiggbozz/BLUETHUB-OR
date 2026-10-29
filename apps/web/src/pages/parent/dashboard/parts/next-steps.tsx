import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarSearch, ChevronRight, Repeat2, Sparkles, Target } from "lucide-react";
import type { ParentChild } from "@/services/parent";
import { useParentChildren } from "@/contexts/parent-children-context";
import { Panel, PanelHeader } from "../../component/ui/panel";
import { stagger, fadeUp } from "../../component/ui/motion";
import { Skeleton } from "../../component/ui/feedback";
import type { AttendanceSummary } from "../../lib/insights";
import { sessionTitle } from "../../lib/insights";
import { childName, shortDate } from "../../lib/format";

interface Step {
  id: string;
  icon: ReactNode;
  title: string;
  detail: string;
  run: () => void;
  emphasis?: boolean;
}

const RECENT_ABSENCE_DAYS = 14;

/** Actions picked from what is actually true for this child right now. */
export function NextSteps({ child, summary, loading }: { child: ParentChild; summary: AttendanceSummary; loading: boolean }) {
  const navigate = useNavigate();
  const { children: list, setSelectedChildId } = useParentChildren();
  const first = child.firstName || "your child";

  const steps: Step[] = [];

  const abs = summary.lastAbsence;
  if (abs) {
    const date = new Date(abs.startedAt);
    const ageDays = (Date.now() - date.getTime()) / 86_400_000;
    if (ageDays <= RECENT_ABSENCE_DAYS) {
      steps.push({
        id: "absence",
        icon: <CalendarSearch className="size-4" />,
        title: `Review the missed ${sessionTitle(abs)} session`,
        detail: `${first} was marked absent on ${shortDate(date)}.`,
        run: () => navigate("/parent/attendance?status=absent"),
        emphasis: true,
      });
    }
  }

  const weakSubject = summary.bySubject.find((s) => s.total >= 3 && s.rate < 75);
  if (weakSubject) {
    steps.push({
      id: "subject",
      icon: <Target className="size-4" />,
      title: `Look at ${weakSubject.name} attendance`,
      detail: `${weakSubject.rate}% across ${weakSubject.total} sessions.`,
      run: () => navigate(`/parent/attendance?q=${encodeURIComponent(weakSubject.name)}`),
    });
  }

  steps.push({
    id: "practice",
    icon: <Sparkles className="size-4" />,
    title: "Build a practice quiz",
    detail: `From topics ${first} was taught recently. Takes about a minute.`,
    run: () => navigate("/parent/assessment"),
    emphasis: steps.length === 0,
  });

  const sibling = list.find((c) => c.studentId !== child.studentId);
  if (sibling) {
    steps.push({
      id: "sibling",
      icon: <Repeat2 className="size-4" />,
      title: `Switch to ${childName(sibling)}`,
      detail: list.length > 2 ? `${list.length - 1} other children are linked to you.` : sibling.classroomName,
      run: () => setSelectedChildId(sibling.studentId),
    });
  }

  if (!abs || steps.length < 3) {
    steps.push({
      id: "calendar",
      icon: <CalendarSearch className="size-4" />,
      title: "See the 12-week attendance calendar",
      detail: "Spot which days were missed at a glance.",
      run: () => navigate("/parent/attendance"),
    });
  }

  if (loading) {
    return (
      <Panel className="lg:col-span-5">
        <PanelHeader eyebrow="Suggested" title="Next steps" />
        <div className="space-y-4 p-5 sm:p-6" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="lg:col-span-5">
      <PanelHeader eyebrow="Suggested" title="Next steps" />
      <motion.ul variants={stagger(0.04, 0.1)} initial="hidden" animate="show" className="space-y-1 p-3 sm:p-4">
        {steps.slice(0, 4).map((s) => (
          <motion.li key={s.id} variants={fadeUp}>
            <button
              type="button"
              onClick={s.run}
              className="group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-(--pp-sunken)"
            >
              <span
                className={
                  s.emphasis
                    ? "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--pp-solid) text-(--pp-solid-fg) shadow-[0_6px_16px_-6px_rgba(11,13,31,0.5)]"
                    : "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-(--pp-line) bg-(--pp-surface) text-(--pp-iris)"
                }
              >
                {s.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-(--pp-text)">{s.title}</span>
                <span className="block truncate text-[12px] text-(--pp-subtle)">{s.detail}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-(--pp-faint) transition-transform group-hover:translate-x-0.5 group-hover:text-(--pp-text)" />
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </Panel>
  );
}
