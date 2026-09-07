import { token } from "@/utils";
import { getTenantFromUrl } from "@/utils/subdomain";
import axios, { type AxiosInstance } from "axios";

export const API: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

API.interceptors.request.use((config) => {
  config.headers["X-Tenant-ID"] = getTenantFromUrl();
  if (token.getToken()) {
    config.headers.Authorization = `Bearer ${token.getToken()}`;
  }
  return config;
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint =
      originalRequest?.url?.includes("/User/login") ||
      originalRequest?.url?.includes("/User/refresh-token");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Park concurrent 401s — resolve them once refresh completes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return API(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) throw new Error("No refresh token stored");

        // ✅ Use plain axios (not `api`) to avoid interceptor loop
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/User/refresh-token`,
          { refreshToken },
        );

        // ✅ Match actual response field name ("token" not "accessToken")
        const newToken: string = data.token;
        const expiresAt = Date.now() + data.tokenExpiresIn * 1000;

        localStorage.setItem("token", newToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("accessTokenExpiresAt", String(expiresAt));

        API.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return API(originalRequest); // retry original request with new token
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        if (window.location.pathname !== "/auth") {
          window.location.href = "/auth";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export type TResponse<T> = {
  responseCode: string;
  isSuccess: boolean;
  data: T;
  status?: string
  responseMessage: string 
};



const endpoints = {
  login: "/api/User/login",
  createUser: "api/User/createUser",
  editUser: "api/User/editUser",
  assignTeacherToClassroom: "api/User/AssignTeacherToClassroom",
  getStudents: "api/User/GetStudents",
  updatePassword: "api/User/updatePassword",
  updatePasswordNewUser: "api/User/update-password/newUser",
  getUserById: "api/User/GetUserById",
  assignPermissions: "api/User/AssignPermissions",
  getAdminPermissions: "api/User/GetAdminPermissions",
  getAllAdminPermissions: "api/User/GetAllAdminPermissions",
  revokePermissions: "api/User/RevokePermissions",
  getTeacher: "/api/User/teachers",
  refreshToken: "/api/User/refresh-token",
  getUserByRole: "/api/User/GetUsersByRole",
  forgotPassword: "/api/User/forgot-password",
  resetPassword: "/api/User/reset-password",
};

interface ILoginRequest {
  username: string;
  hashPassword: string;
  inst: string;
  deviceType: string;
  deviceIp: string;
}

export interface ILoginChild {
  studentId: string;
  firstName: string;
  lastName: string;
  classroomId: string;
  classroomName: string;
}

export interface ILoginResponse {
  firstName: string;
  lastName: string;
  emailAddress: string ;
  isActive: boolean;
  id: string;
  roleId: number;
  firstTimeLogin: boolean;
  token: string;
  tokenExpiresIn: number;
  schoolInfo: {
    id: string;
    schoolName: string;
    location: string;
    countryId: number;
    stateId: number;
    address: string;
    logoUrl: string;
  };
  /** Populated only for Parent (roleId 6); null for every other role. */
  children: ILoginChild[] | null;
  responseMessage: string;
  responseCode: string;
  status: string;
  data: null;
  refreshToken: string;
}

export interface IcreateUserRequest {
  createdby: string;
  firstName: string;
  lastName: string;
  emailAddress?: string;
  hashPassword: string;
  isActive: boolean;
  hasAccess: boolean;
  userName: string;
  dob: string;
  lineManagerId?: string;
  schoolId: string;
  role: number;
  userClassroomsId?: string[];
  userSubjects?: string[];
  userSubjectClassrooms?: { subjectId: string; classroomId: string }[];
  removeSubjects?: string[];
  removeClassroom?: string[];
}

export interface IEditUserRequest {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  /** Omit unless the caller actually intends to change the password — the
   * backend applies this unconditionally whenever it's non-empty. */
  hashPassword?: string;
  isActive: boolean;
  hasAccess: boolean;
  roleId: number;
  profileImage: string;
  guardianName: string;
  userClassroomsId?: string[];
  userSubjects?: string[];
  removeSubjects?: string[];
  removeClassroom?: string[];
}

export interface IAssignTeacherToClassroomRequest {
  teacherId: string;
  classroomId: string;
  isPrimary?: boolean;
}

export interface IUpdateTeacherSubjectRequest {
  subjectIds: string[];
  classroomId: string;
}

export interface IupdatePasswordRequest {
  hashPassword: string;
  currentHashPassword: string;
  username: string;
  deviceIp: string;
  deviceType: string;
}
export interface IupdatePasswordRequestNewuser {
  hashPassword: string;
  currentHashPassword: string;
  schoolId: string;
  username: string;
  deviceIp: string;
  deviceType: string;
}


interface IAssignPermissionsRequest {
  adminUserId: string;
  permissions: string[] | number[];
}

interface IGetAdminPermissionsRequest {
  pageNumber: number;
  pageSize: number;
}

export interface IUserResponse {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  isActive: boolean;
  roleId: number;
  schoolInfo: {
    id: string;
    schoolName: string;
    location: string;
    countryId: number;
    stateId: number;
    address: string;
  };
}

interface GetStudentsParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface IUpdateStudentAssignmentRequest {
  classroomId?: string;
  minorSubjectIds?: string[];
  addSubjects?: string[];
  removeSubjects?: string[];
}

export interface IForgotPasswordResponse {
  responseMessage: string;
  responseCode: string;
  status: string;
}

export interface IResetPasswordRequest {
  token: string;
  newHashPassword: string;
  confirmHashPassword: string;
}

export interface IResetPasswordResponse {
  responseMessage: string;
  responseCode: string;
  status: string;
}

export const authService = {
  login: (data: ILoginRequest) => {
    return API.post<ILoginResponse>(endpoints.login, data, {
      headers: {
        "X-Tenant-ID":  getTenantFromUrl(),
      },
    });
  },

  refreshToken: (refreshToken: string) => {
    return API.post<TResponse<unknown>>(endpoints.editUser, { refreshToken });
  },
  createUser: (data: IcreateUserRequest) => {
    return API.post<TResponse<unknown>>(endpoints.createUser, data, {
      headers: {
        "X-Tenant-ID":  getTenantFromUrl(),
      },
    });
  },

  editUser: (data: IEditUserRequest) => {
    return API.post<TResponse<unknown>>(endpoints.editUser, data);
  },

  assignTeacherToClassroom: (data: IAssignTeacherToClassroomRequest) => {
    return API.post<TResponse<unknown>>(endpoints.assignTeacherToClassroom, {
      teacherId: data.teacherId,
      classroomId: data.classroomId,
      isPrimary: data.isPrimary ?? false,
    }, {
      headers: {
        "X-Tenant-ID": getTenantFromUrl(),
      },
    });
  },

  updateTeacherSubject: (teacherId: string, data: IUpdateTeacherSubjectRequest) => {
    return API.put<TResponse<unknown>>(`api/User/teacher/${teacherId}/subject`, data);
  },

  getStudents: (
    params: GetStudentsParams = { pageNumber: 1, pageSize: 50 },
  ) => {
    return API.get<TResponse<unknown>>(endpoints.getStudents, {
      headers: {
        "X-Tenant-ID":  getTenantFromUrl(),
      },
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 50,
      },
    });
  },

  updatePassword: (data: IupdatePasswordRequest) => {
    return API.post<TResponse<unknown>>(endpoints.updatePassword, data, {
      headers: {
        "X-Tenant-ID":  getTenantFromUrl(),
      },
    });
  },

   updatePasswordNewUser: (data: IupdatePasswordRequestNewuser) => {
    return API.post<ILoginResponse>(endpoints.updatePasswordNewUser, data, {
      headers: {
        Authorization: `Bearer ${token.getToken()}`,
        "X-Tenant-ID":  getTenantFromUrl(),
      },
    });
  },

  // service
  getUserById: (userId: string) => {
    return API.get(endpoints.getUserById, {
      params: { userId },
      // headers: {
      //   "X-Tenant-ID":  X_Tenant_ID,
      // },
    });
  },
  assignPermissions: (data: IAssignPermissionsRequest) => {
    return API.post<TResponse<unknown>>(endpoints.assignPermissions, data);
  },
  getAdapterPermissions: (adminUserId: string) => {
    return API.get<TResponse<unknown>>(endpoints.getAdminPermissions, {
      params: { adminUserId },
      //  headers: {
      //   "X-Tenant-ID":  X_Tenant_ID,
      // },
    });
  },

  getAllAdminPermissions: (data: IGetAdminPermissionsRequest) => {
    return API.get<TResponse<unknown>>(endpoints.getAdminPermissions, {
      params: data,
    });
  },

  revokePermissions: (adminUserId: string) => {
    return API.post<TResponse<unknown>>(endpoints.revokePermissions, {
      adminUserId,
    });
  },

  getTeacher: () => {
    return API.get(endpoints.getTeacher, {
      headers: {
        "X-Tenant-ID":  getTenantFromUrl(),
      },
    });
  },

  getUserByRole: (roleId: number) => {
    return API.get(endpoints.getUserByRole, {
      params: { roleId, pageNumber: 1, pageSize: 50 },
      headers: {
        "X-Tenant-ID":  getTenantFromUrl(),
      },
    });
  },

  getStudentMinorSubjects: (userId: string, classroomId: string) => {
    return API.get<TResponse<unknown>>(`api/User/${userId}/minor-subjects`, {
      params: { classroomId },
      headers: { "X-Tenant-ID": getTenantFromUrl() },
    });
  },

  updateStudentAssignment: (userId: string, data: IUpdateStudentAssignmentRequest) => {
    return API.post<TResponse<unknown>>(`api/User/student/${userId}/assignment`, data, {
      headers: { "X-Tenant-ID": getTenantFromUrl() },
    });
  },

  // Needs the tenant header — the backend resolves which school's user table
  // to look the username up against from it.
  forgotPassword: (username: string) => {
    return API.post<IForgotPasswordResponse>(
      endpoints.forgotPassword,
      { username },
      { headers: { "X-Tenant-ID": getTenantFromUrl() } },
    );
  },

  // No tenant header — the reset token itself resolves the user/school
  // server-side, and the emailed link may be opened outside the school's
  // subdomain.
  resetPassword: (data: IResetPasswordRequest) => {
    return API.post<IResetPasswordResponse>(endpoints.resetPassword, data);
  },
};
