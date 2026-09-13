import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";
// import { X_Tenant_ID } from "@/utils/tenant";

// ── Endpoints ────────────────────────────────────────────────────────────────
const endpoints = {
  addCourse: "/api/School/registersubject",
  getAllSubjects: (schoolId: string) =>
    `/api/School/getAllSchoolSubjects?schoolId=${schoolId}`,
};

// ── Types ────────────────────────────────────────────────────────────────────
export type TAddCourse = {
  category: string;
  subject: string;
  isActive: boolean;
};

type AddCoursePayload = {
  createdBy: string;
  schoolId: string;
  subjects: TAddCourse[];
};

// ── Service ──────────────────────────────────────────────────────────────────
export const adminService = {
  addCourses: (payload: AddCoursePayload) =>
    API.post<TResponse<unknown>>(endpoints.addCourse, payload, {
      headers: { "X-Tenant-ID": getTenantFromUrl() },
    }),

  getAllSubjects: (schoolId: string): Promise<any> => {
    const request = API.post(endpoints.getAllSubjects(schoolId), {}, {
      headers: { "X-Tenant-ID": getTenantFromUrl() },
    });

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please try again.")), 10000)
    );

    return Promise.race([request, timeout]);
  },

  unlockUser: (userId: string) =>
    API.post<TResponse<null>>(`/api/User/${userId}/unlock`, null, {
      headers: { "X-Tenant-ID": getTenantFromUrl() },
    }),

  // Staff-initiated password reset for a forgetful student — no body, the
  // student is identified by the route and the caller by their own JWT.
  // 400 if the target isn't a Student, 403 if the caller isn't authorized
  // (e.g. a ClassTeacher targeting a student outside their own classroom).
  resetStudentPassword: (studentId: string) =>
    API.post<TResponse<ResetStudentPasswordData>>(
      `/api/User/students/${studentId}/reset-password`,
      null,
      { headers: { "X-Tenant-ID": getTenantFromUrl() } },
    ),
};

export interface ResetStudentPasswordData {
  studentId: string;
  studentName: string;
  tempPassword: string;
}
