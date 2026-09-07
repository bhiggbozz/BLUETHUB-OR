import { Bell, EllipsisVertical, Menu } from "lucide-react";
import AdminAppbar from "./app-bar";
import Charts from "./charts";
import SchoolProgress from "./school-progress";
import { SchoolAtAGlance } from "./component/school-at-a-glance";
import { RecentActivity } from "./component/recent-activity";
import { PendingLessonApprovals } from "./component/pending-lesson-approvals";
import { TeacherActivity } from "./component/teacher-activity";
import { ClassroomPerformance } from "./component/classroom-performance";
import { MobileNav } from "../side-bar";
import { useState } from "react";
import { useAuthContext } from "@/contexts/auth-context";

const AdminDashboard = () => {
  const [isOpen, setIsOpen]= useState(false)
  const { user } = useAuthContext()

   const getInitials = (name?: string) => {
    if (!name) return "";
    return name
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
  };

  const initials = getInitials(user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "WA"); 

  return (
    <div className="font-poppins w-full lg:py-1 lg:px-2">
      <MobileNav isOpen={isOpen} setIsOpen={setIsOpen}/>
      <div className="backdrop-blur-sm  border border-white/20 overflow-hidden">

        {/* ── Top Nav ── */}
        <div className="flex items-center justify-between px-4 h-12 bg-chestnut">
          <div className="flex gap-2 items-center">
            <Menu className="lg:hidden text-white" onClick={() => setIsOpen(true)} />
            <span className="text-white font-semibold text-sm">Dashboard</span>
          </div>
          <EllipsisVertical className="text-white hidden md:block" />
          <div className="flex gap-[3px] md:hidden items-center justify-between ">
             <div className="w-full h-full px-2.5 py-2 rounded-full flex items-center justify-center bg-[#FFFFFF80]">
              <span className="text-white font-medium text-xs leading-5">{initials}</span>
             </div>
             <div className="w-full h-full p-2 rounded-full flex items-center justify-center bg-white">
              <Bell className="text-chestnut" />
             </div>
          </div>
        </div>

        {/* ── Page Body ── */}
        <div className="flex flex-col gap-3 p-3 md:p-4 bg-white/70 backdrop-blur-sm">
          <AdminAppbar />
          <SchoolProgress />
          <TeacherActivity />
          <Charts />
          <ClassroomPerformance />

          {/* ── Bottom section: stacked on mobile, side-by-side on md+ ── */}
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="w-full lg:flex-1 min-w-0">
              <PendingLessonApprovals />
            </div>
            <div className="flex flex-col gap-4 w-full lg:w-[38%] lg:shrink-0">
              <SchoolAtAGlance />
              <RecentActivity />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
