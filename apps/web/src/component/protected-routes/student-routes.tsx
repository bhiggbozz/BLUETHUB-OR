import { useAuthContext } from "@/contexts/auth-context";
import { getOfflineUser, isOfflineAuthenticated } from "@/utils/offline-learner";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

const StudentProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { isLoading, user, isAuthenticated, OfflineUser } = useAuthContext();
    const offlineUser = getOfflineUser();
    const isOffline = isOfflineAuthenticated();

    const authed = isAuthenticated || isOffline;
    const effectiveUser = user ?? offlineUser;

    if (isLoading) {
        return (
            <div className="bluetsch-loader">
                {/* Background effects */}
                <div className="loader-background" />
                <div className="loader-orb loader-orb-one" />
                <div className="loader-orb loader-orb-two" />
                <div className="loader-orb loader-orb-three" />
                {/* Orbiting particles */}
                <span className="loader-particle particle-one" />
                <span className="loader-particle particle-two" />
                <span className="loader-particle particle-three" />
                <span className="loader-particle particle-four" />
                {/* Main content */}
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
    }

    if (!authed || !effectiveUser) return <Navigate to="/auth" replace />;
    if (effectiveUser.roleName && effectiveUser.roleName !== 'Student') {
        return <Navigate to="/auth" replace />;
    }
    if(!OfflineUser  && offlineUser?.OfflineUser) {
        
    }
    return <>{children}</>;
};

export default StudentProtectedRoute;