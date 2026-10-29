import { CalendarDays, ChevronLeft } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context";

function dashboardPathFor(roleName: string | undefined): string {
  switch (roleName) {
    case "Student":
      return "/student";
    case "Parent":
      return "/parent";
    case "HeadTeacher":
    case "SubjectTeacher":
    case "ClassTeacher":
      return "/teacher";
    case "SuperAdministrator":
    case "Administrator":
    case "Admin":
      return "/admin";
    default:
      return "/auth";
  }
}

const CalendarLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const isSetup = location.pathname.startsWith("/calendar/setup");
  const dashboardPath = dashboardPathFor(user?.roleName);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,97,232,0.10),_transparent_28%),linear-gradient(180deg,_#f5f7ff_0%,_#eef3ff_52%,_#f8fafc_100%)]">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2.5 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => (isSetup ? navigate(-1) : navigate(dashboardPath))}
            aria-label={isSetup ? "Back" : "Back to dashboard"}
            title={isSetup ? "Back" : "Back to dashboard"}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <CalendarDays className="h-5 w-5 text-[#4F61E8]" />
          <h1 className="text-sm font-bold text-slate-800">School Calendar</h1>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default CalendarLayout;
