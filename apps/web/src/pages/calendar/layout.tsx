import { CalendarDays, ChevronLeft } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context";
import { AppThemeProvider, ThemeSwitcher } from "@/component/shared/app-theme";

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
    <AppThemeProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2.5 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => (isSetup ? navigate(-1) : navigate(dashboardPath))}
              aria-label={isSetup ? "Back" : "Back to dashboard"}
              title={isSetup ? "Back" : "Back to dashboard"}
              className="rounded-full p-1 text-muted-foreground hover:bg-accent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <CalendarDays className="h-5 w-5 text-forestBlue-light" />
            <h1 className="flex-1 text-sm font-bold text-foreground">School Calendar</h1>
            <ThemeSwitcher />
          </div>
        </header>
        <Outlet />
      </div>
    </AppThemeProvider>
  );
};

export default CalendarLayout;
