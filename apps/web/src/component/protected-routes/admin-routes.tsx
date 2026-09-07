import { useAuthContext } from "@/contexts/auth-context";
import { type ReactNode } from "react"
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
    children: ReactNode;
}

const AdminProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoading, user, isAuthenticated } = useAuthContext();

  if (isLoading) { return ( <div className="bluetsch-loader"> {/* Background effects */} <div className="loader-background" /> <div className="loader-orb loader-orb-one" /> <div className="loader-orb loader-orb-two" /> <div className="loader-orb loader-orb-three" /> {/* Orbiting particles */} <span className="loader-particle particle-one" /> <span className="loader-particle particle-two" /> <span className="loader-particle particle-three" /> <span className="loader-particle particle-four" /> {/* Main content */} <div className="loader-content"> {/* Logo circle */} <div className="loader-circle"> <div className="circle-outline" /> <div className="gradient-ring" /> <div className="inner-glow" /> <h1 className="loader-logo"> BLUETSCH </h1> </div> {/* Status */} <div className="loader-status"> <span className="loader-status-title"> THE LOADING </span> <span className="loader-status-message"> Getting everything ready </span> <div className="loader-dots"> <span /> <span /> <span /> </div> </div> </div> </div> ); }

 if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
}

  if (
    user.roleName !== "SuperAdministrator" &&
    user.roleName !== "Administrator" &&
    user.roleName !== "Admin"
  ) {
    return <Navigate to="/auth" replace />; // ✅ back to /auth, not /unauthorized
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
