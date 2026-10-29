import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context";
import { useCanManageCalendar } from "@/pages/calendar/hooks/use-can-manage-calendar";

const BluetschLoader = () => (
  <div className="bluetsch-loader">
    <div className="loader-background" />
    <div className="loader-orb loader-orb-one" />
    <div className="loader-orb loader-orb-two" />
    <div className="loader-orb loader-orb-three" />
    <span className="loader-particle particle-one" />
    <span className="loader-particle particle-two" />
    <span className="loader-particle particle-three" />
    <span className="loader-particle particle-four" />
    <div className="loader-content">
      <div className="loader-circle">
        <div className="circle-outline" />
        <div className="gradient-ring" />
        <div className="inner-glow" />
        <h1 className="loader-logo">BLUETSCH</h1>
      </div>
      <div className="loader-status">
        <span className="loader-status-title">THE LOADING</span>
        <span className="loader-status-message">Getting everything ready</span>
        <div className="loader-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  </div>
);

/** /calendar — every signed-in role can read the school calendar. */
export const CalendarProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isLoading, user, isAuthenticated } = useAuthContext();

  if (isLoading) return <BluetschLoader />;
  if (!isAuthenticated || !user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
};

/** /calendar/setup — SuperAdministrator always, Administrator only with ManageCalendar. */
export const CalendarSetupProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isLoading, user, isAuthenticated } = useAuthContext();
  const access = useCanManageCalendar();

  if (isLoading) return <BluetschLoader />;
  if (!isAuthenticated || !user) return <Navigate to="/auth" replace />;
  if (access.status === "loading") return <BluetschLoader />;
  if (access.status !== "granted") return <Navigate to="/calendar" replace />;

  return <>{children}</>;
};

export default CalendarProtectedRoute;
