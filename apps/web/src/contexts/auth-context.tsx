// context/AuthContext.tsx
import { authService, } from "@/services/auth";
import { token } from "@/utils";
import { getParsedToken } from "@/utils/decode";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import {
  isNetworkFailure,
  isWithinOfflineGrace,
  markOnlineContact,
  saveCachedUser,
  getCachedUser,
  clearOfflineSession,
} from "@/utils/offline-session";



export interface Subject {
  subjectId: string;
  subjectName: string;
  subjectCategory: string;
}

// Teacher shape
interface TeacherClassroom {
  classroomId: string;
  className: string;
  subjects: Subject[];
}

export interface TeacherRoleData {
  classrooms: TeacherClassroom[];
}

// Student shape
export interface StudentClassroom {
  classroomId: string;
  className: string | null;
  classroomIsActive: boolean;
}

export interface StudentRoleData {
  classroom: StudentClassroom;
  majorSubjects?: Subject[];
  minorSubjects?: Subject[];
  subjects?: Subject[];
  totalSubjects?: number;
}

type RoleData = TeacherRoleData | StudentRoleData;

// Type guards
export const isTeacherRoleData = (roleData: RoleData): roleData is TeacherRoleData => {
  return "classrooms" in roleData;
};

export const isStudentRoleData = (roleData: RoleData): roleData is StudentRoleData => {
  return "classroom" in roleData;
};

interface IUser {
  createdDate: string;
  emailAddress: string;
  firstName: string;
  guardianName: string | null;
  hasAccess: boolean;
  id: string
  isActive: boolean;
  lastName: string;
  modifiedDate: string;
  profileImage: string | null;
  roleId: number;
  roleName: string;
  userName: string;
  refreshToken?: string
  roleData?: RoleData;
}
interface AuthContextType {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (tokenValue: string, userData: any, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: IUser | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const hydrateUserFromToken = async () => {
    const storedToken = token.getToken();

    if (!storedToken) {
      setUser(null);
      return;
    }

    const parsed = getParsedToken(storedToken);

    if (!parsed?.id) {
      setUser(null);
      return;
    }

    try {
      const response = await authService.getUserById(parsed.id);
      setUser(response.data.data);
      saveCachedUser(response.data.data);
      // Deliberately NOT markOnlineContact() here — this just revalidates an
      // existing token on app boot / periodic refresh, it isn't the student
      // presenting credentials. The 3-day clock only resets on an explicit
      // login() call below.
    } catch (error) {
      // Being offline (or a transient network error) shouldn't log the
      // student out — fall back to the last confirmed user snapshot as long
      // as we're still within the 3-day offline grace window. A real
      // rejection from the backend (bad/expired token) still throws through
      // to the caller, which logs out as before.
      if (isNetworkFailure(error) && isWithinOfflineGrace()) {
        const cached = getCachedUser<IUser>();
        if (cached) {
          setUser(cached);
          return;
        }
      }
      throw error;
    }
  };

  useEffect(() => {
    const init = async () => {
      const storedToken = token.getToken();

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      const parsed = getParsedToken(storedToken);

      if (!parsed) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true)
        await hydrateUserFromToken();
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        clearOfflineSession();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const login = (tokenValue: string, userData: IUser, refreshToken: string) => {
    token.login(tokenValue, refreshToken);
    setUser({
      ...userData,
      roleName: userData.roleName ?? userData.roleName,
    });
    saveCachedUser(userData);
    // This only runs after a real online authentication just succeeded
    // (the login screen already called the login API with live credentials)
    // — this is the one place the 3-day offline clock is allowed to reset.
    markOnlineContact();

    void hydrateUserFromToken().catch((error) => {
      console.error('Error hydrating user after login:', error);
    });
  };

  const logout = () => {
    setIsLoggingOut(true);
    // Try to call logout API, but don't fail if it errors (offline support)
    try {
      token.clearAll();
      clearOfflineSession();
      <Navigate to="/auth" />;
    } catch (error) {
      // Network error or token already invalid - still proceed with local logout
      console.warn('Logout API call failed, proceeding with local logout:', error);
    }
    finally {
      token.clearAll();
      clearOfflineSession();
      setUser(null);
      setIsLoggingOut(false);
    }
  };

  const refreshUser = async () => {
    try {
      await hydrateUserFromToken();
    } catch (error) {
      console.error('Error refreshing user:', error);
      logout();
    }
  };


  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!token.getToken(),
    isLoading,
    isLoggingOut,
    login,
    logout,
    setUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
};
