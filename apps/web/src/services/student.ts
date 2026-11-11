import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";
import type { LessonDeliveryMode } from "@/services/lesson";


// import { X_Tenant_ID } from "@/utils/tenant";

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface StudentDashboardStats {
  classesThisWeek: number;
  quizzesThisWeek: number;
  assessmentsThisWeek: number;
  pendingAssignments: number;
  hasLiveClass: boolean;
}

export interface StudentClassItem {
  id: string;
  lessonId: string;
  subjectId: string;
  subjectName: string;
  topicName: string;
  subTopic: string;
  teacherName: string;
  publishedAt: string;
  duration?: number;
  thumbnailUrl?: string;
  hasWatched: boolean;
  watchProgress?: number;
}

export interface StudentClassesResponse {
  classes: StudentClassItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface StudentQuizItem {
  id: string;
  title: string;
  subjectName: string;
  questionCount: number;
  durationMinutes: number;
  dueDate?: string;
  status: "pending" | "completed" | "expired";
  score?: number;
  maxScore?: number;
}

export interface StudentQuizzesResponse {
  quizzes: StudentQuizItem[];
  totalCount: number;
}

export interface StudentAssessmentItem {
  id: string;
  title: string;
  subjectName: string;
  type: string;
  dueDate?: string;
  status: "pending" | "submitted" | "graded";
  score?: number;
  maxScore?: number;
}

export interface StudentAssessmentsResponse {
  assessments: StudentAssessmentItem[];
  totalCount: number;
}

export interface StudentSubjectItem {
  subjectId: string;
  subjectName: string;
  category: string;
  subjectType: "Major" | "Minor" | string;
}

export interface StudentSubjectsResponse {
  studentId: string;
  totalSubjects: number;
  major: StudentSubjectItem[];
  minor: StudentSubjectItem[];
}

export interface SubjectStatsResponse {
  subjectId: string;
  subjectName: string;
  lessonCount: number;
  quizCount: number;
}

export interface StudentPublishedLesson {
  id: string;
  aim: string;
  description: string;
  status?: string;
  subTopic: string;
  subTopicId?: string | null;
  subTopicName?: string | null;
  createdAt?: string;
  teacherName: string;
  approvedByName?: string;
  approvedAt: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  classroomId?: string;
  className?: string;
  accessDate?: string | null;
  accessTime?: string | null;
  durationMinutes?: number | null;
  accessEndsAt?: string | null;
  mediaCount: number;
  media?: StudentLessonMedia[];
  quizId?: string | null;
  quizCode?: string | null;
  /** "Live" means this lesson was originally delivered as a real-time Live
   * Class (and has since been published with its recording). Omitted/absent
   * means "Recorded" — a plain uploaded lesson. */
  deliveryMode?: LessonDeliveryMode;
}

export interface StudentLessonMedia {
  lessonContentId?: string;
  mediaId?: string;
  mediaName: string;
  url: string;
  mediaType?: string;
  fileExtension?: string;
  fileSizeBytes?: number;
  displayOrder?: number;
}

export interface StudentSubjectLessonsResponse {
  subjectId: string;
  summary?: {
    total: number;
    approved: number;
    pendingApproval: number;
    rejected: number;
    published: number;
  };
  lessons: StudentPublishedLesson[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const headers = { "X-Tenant-ID": getTenantFromUrl() };

export const studentService = {
  // ── DASHBOARD STATS ────────────────────────────────────────────────────────
  getDashboardStats: () =>
    API.get<TResponse<StudentDashboardStats>>(
      "api/student/dashboard/stats",
      { headers }
    ),

  // ── CLASSES (Recorded lessons) ─────────────────────────────────────────────
  getClasses: (params?: { subjectId?: string; page?: number; pageSize?: number }) =>
    API.get<TResponse<StudentClassesResponse>>(
      "api/student/classes",
      { headers, params }
    ),

  getRecentClasses: (limit: number = 10) =>
    API.get<TResponse<StudentClassesResponse>>(
      "api/student/classes/recent",
      { headers, params: { limit } }
    ),

  // ── QUIZZES ────────────────────────────────────────────────────────────────
  getQuizzes: (params?: { status?: string; page?: number; pageSize?: number }) =>
    API.get<TResponse<StudentQuizzesResponse>>(
      "api/student/quizzes",
      { headers, params }
    ),

  getPendingQuizzes: () =>
    API.get<TResponse<StudentQuizzesResponse>>(
      "api/student/quizzes/pending",
      { headers }
    ),

  // ── ASSESSMENTS ────────────────────────────────────────────────────────────
  getAssessments: (params?: { status?: string; page?: number; pageSize?: number }) =>
    API.get<TResponse<StudentAssessmentsResponse>>(
      "api/student/assessments",
      { headers, params }
    ),

  getPendingAssessments: () =>
    API.get<TResponse<StudentAssessmentsResponse>>(
      "api/student/assessments/pending",
      { headers }
    ),

  // ── REGISTERED SUBJECTS ───────────────────────────────────────────────────
  getRegisteredSubjects: () =>
    API.get<TResponse<StudentSubjectsResponse>>(
      "api/User/GetStudentSubjects",
      { headers }
    ),

  getLessonsBySubject: (subjectId: string) =>
    API.get<TResponse<StudentSubjectLessonsResponse>>(
      `api/lessons/subject/${subjectId}`,
      { headers }
    ),

  // ── SUBJECT STATS ───────────────────────────────────────────────────────────
  getSubjectStats: (subjectId: string, classroomId: string) =>
    API.get<TResponse<SubjectStatsResponse>>(
      `api/School/subject/${subjectId}/classroom/${classroomId}/stats`,
      { headers }
    ),

  // ── MARK PROGRESS ──────────────────────────────────────────────────────────
  updateWatchProgress: (lessonId: string, progressPercent: number) =>
    API.post<TResponse<null>>(
      `api/student/classes/${lessonId}/progress`,
      { progressPercent },
      { headers }
    ),
};

export default studentService;
