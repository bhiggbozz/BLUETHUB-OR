import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useParentChildren } from "@/contexts/parent-children-context";
import type { ParentChild } from "@/services/parent";
import CalendarTermDashboardCard from "@/pages/calendar/components/calendar-term-dashboard-card";
import { Button } from "../component/ui/button";
import { ChildrenGate } from "../component/ui/children-gate";
import { Skeleton } from "../component/ui/feedback";
import { PageHeader } from "../component/ui/panel";
import { stagger } from "../component/ui/motion";
import { greetingFor } from "../lib/format";
import { useAttendanceHistory } from "../lib/hooks";
import { sortNewestFirst, summarizeAttendance } from "../lib/insights";
import { InsightsPanel } from "./parts/insights-panel";
import { NextSteps } from "./parts/next-steps";
import { RecentActivity } from "./parts/recent-activity";
import { SpotlightCard } from "./parts/spotlight-card";
import { WelcomeGuide } from "./parts/welcome-guide";

const ParentDashboard = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { loading: childrenLoading, children: childList } = useParentChildren();
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={today}
        title={`${greetingFor()}, ${user?.firstName ?? "there"}`}
        description="Here's how things are going at school, based on what teachers have recorded."
        actions={
          (childrenLoading || childList.length > 0) && <Button icon={<Sparkles className="size-4" />} onClick={() => navigate("/parent/assessment")}>
            Practice quiz
          </Button>
        }
      />
      <WelcomeGuide />
      <CalendarTermDashboardCard />
      <ChildrenGate skeleton={<DashboardSkeleton />}>{(child) => <DashboardBody child={child} />}</ChildrenGate>
    </motion.div>
  );
};

function DashboardBody({ child }: { child: ParentChild }) {
  const history = useAttendanceHistory(child.studentId);
  const sorted = useMemo(() => sortNewestFirst(history.data), [history.data]);
  const summary = useMemo(() => summarizeAttendance(sorted), [sorted]);

  return (
    <motion.div
      key={child.studentId}
      variants={stagger(0.06)}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12"
    >
      <SpotlightCard child={child} />
      <InsightsPanel summary={summary} loading={history.loading} error={history.error} onRetry={history.reload} />
      <RecentActivity
        items={sorted}
        loading={history.loading}
        error={history.error}
        onRetry={history.reload}
        firstName={child.firstName || "your child"}
      />
      <NextSteps child={child} summary={summary} loading={history.loading} />
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12" aria-busy="true" aria-label="Loading overview">
      <Skeleton className="h-[340px] rounded-[20px] lg:col-span-7" />
      <Skeleton className="h-[340px] rounded-[20px] lg:col-span-5" />
      <Skeleton className="h-[320px] rounded-[20px] lg:col-span-7" />
      <Skeleton className="h-[320px] rounded-[20px] lg:col-span-5" />
    </div>
  );
}

export default ParentDashboard;
