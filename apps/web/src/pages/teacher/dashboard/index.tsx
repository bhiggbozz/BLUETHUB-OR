import Activity from "@/pages/teacher/dashboard/activity"
// import Recordedclass from "@/pages/teacher/dashboard/recorded-class"
import { Menu, } from "lucide-react"
import TeacherAppBar from "@/pages/teacher/dashboard/teacher-app-bar"
// import TodayClasses from "./today-classes"
// import AssessmentSubmissions from "./assessment-submissions"
// import PendingReviews from "./pending-reviews"
// import UpcomingDeadlines from "./upcoming-deadlines"
import PendingUploadsCard from "./pending-uploads-card"
import { useOutletContext } from "react-router-dom";
// import NavbarStats from "@/component/performance-navbar-stats";
// import PerformanceOverview from "./performance-overview";
import { useAuthContext,
  //  isTeacherRoleData
   } from "@/contexts/auth-context";
import HeadTeacherDashboard from "./head-teacher-dashboard";
// import { useMemo } from "react";

const TeacherDashboard = () => {
  const { user } = useAuthContext();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();

  // const assignedClassrooms = useMemo(() => {
  //   const rd = user?.roleData;
  //   if (rd && isTeacherRoleData(rd)) {
  //     return rd.classrooms.map((c) => c.classroomId);
  //   }
  //   return [];
  // }, [user]);

  if (user?.roleName === "HeadTeacher" || user?.roleName === "ClassTeacher") {
    return <HeadTeacherDashboard />;
  }

  return (
    <div className="">
      <div className="lg:rounded-2xl overflow-hidden">
        <div className="flex lg:hidden items-center justify-between px-4 py-2 bg-chestnut">
          <div className="flex gap-2 items-center">
            <Menu className="lg:hidden text-white" onClick={openMobileNav} />
            <span className="text-white font-medium md:py-2 text-sm">Dashboard</span>
          </div>
        </div>

        <div className="bg-white p-3 md:p-4 space-y-2 pb-2 min-h-screen">
          {/* Assigned classrooms indicator */}
          {/* {assignedClassrooms.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <School className="w-3.5 h-3.5 text-chestnut" />
              <span>Showing data for your assigned classrooms only</span>
            </div>
          )} */}

          <TeacherAppBar />
          {/* <NavbarStats /> */}
          <PendingUploadsCard />
          <Activity />
          {/* <PerformanceOverview assignedClassroomIds={assignedClassrooms} /> */}

          {/* <div className="flex flex-col lg:flex-row gap-2"> */}
            {/* Left column */}
            {/* <div className="space-y-2 flex-1">
              <TodayClasses />
              <AssessmentSubmissions />
            </div> */}

            {/* Right column */}
            {/* <div className="space-y-2 lg:w-[30%] shrink-0">
              <PendingReviews />
              <Recordedclass />
              <UpcomingDeadlines />
            </div> */}
          {/* </div> */}
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard