import StudentAppBar from "./app-bar";
import ExtracurricularActivity from "./extra-curricular-activity";
import MyCourse from "./my-course";
import PerformanceOverview from "./performance-overview";
import StudentSummary from "./student-summary";
import CalendarTermDashboardCard from "@/pages/calendar/components/calendar-term-dashboard-card";

const StudentIndex = () => {
  return (
    <div
      className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col space-y-4 overflow-y-auto rounded-md border border-white/70 bg-white/55 backdrop-blur-xl transition-all duration-300 md:p-3 lg:p-4
  [&::-webkit-scrollbar]:w-1
  [&::-webkit-scrollbar]:h-2.5 
  [&::-webkit-scrollbar-track]:rounded-full
  [&::-webkit-scrollbar-track]:bg-slate-100
  [&::-webkit-scrollbar-thumb]:rounded-full
  [&::-webkit-scrollbar-thumb]:bg-slate-300
  dark:[&::-webkit-scrollbar-track]:bg-neutral-700
  dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 "
    >
      <StudentAppBar />
      <CalendarTermDashboardCard />
      <ExtracurricularActivity />
      <PerformanceOverview />
      <StudentSummary />
      <MyCourse />
    </div>
  );
};

export default StudentIndex;
