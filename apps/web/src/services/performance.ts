import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";

const headers = { "X-Tenant-ID": getTenantFromUrl() };

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface AdminNavbarDto {
  totalStudents: number;
  totalTeachers: number;
  totalClassrooms: number;
  totalAttempts: number;
  overallAverageScore: number;
  overallPassRate: number;
  pendingGradingItems: number;
}

export interface SubjectTeacherNavbarDto {
  classCount: number;
  subjectCount: number;
  totalStudents: number;
  overallAverageScore: number;
  overallPassRate: number;
  pendingGradingItems: number;
  classesToday?: number;
  pendingApprovals?: number;
  lessonsThisWeek?: number
}

export interface ClassTeacherNavbarDto {
  classCount: number;
  totalStudents: number;
  overallAverageScore: number;
  overallPassRate: number;
  pendingGradingItems: number;
  pendingApprovalsCount?: number;
    classesToday?: number;
  pendingApprovals?: number;
  lessonsThisWeek?: number
}

export interface StudentNavbarDto {
  totalAttempts: number;
  completedAttempts: number;
  averageScorePercent: number;
  passRate: number;
  pendingQuizzes: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — Shared breakdown DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuizBreakdownDto {
  quizCode: string;
  lessonTitle: string;
  lessonId: string;
  attemptCount: number;
  averageScore: number;
  passRate: number;
}

export interface PerformanceClassroomDto {
  classroomId: string;
  classroomName: string;
  subjectId: string | null;
  subjectName: string | null;
  studentCount: number;
  totalAttempts: number;
  completedAttempts: number;
  averageScorePercent: number;
  passRate: number;
  averageTimeTakenSeconds: number | null;
  lastActivityDate: string | null;
  computedAt: string;
  quizBreakdown: QuizBreakdownDto[];
}

export interface PerformanceSubjectDto {
  classroomId: string | null;
  classroomName: string | null;
  subjectId: string;
  subjectName: string;
  studentCount: number;
  totalAttempts: number;
  completedAttempts: number;
  averageScorePercent: number;
  passRate: number;
  averageTimeTakenSeconds: number | null;
  lastActivityDate: string | null;
  computedAt: string;
  quizBreakdown: QuizBreakdownDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — Admin DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface SchoolPerformanceOverviewDto {
  totalStudents: number;
  totalAttempts: number;
  completedAttempts: number;
  overallAverageScore: number;
  overallPassRate: number;
  classroomCount: number;
  subjectCount: number;
  computedAt: string;
  classroomBreakdown: PerformanceClassroomDto[];
  subjectBreakdown: PerformanceSubjectDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — Teacher DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface TeacherPerformanceDashboardDto {
  teacherId: string;
  teacherName: string;
  totalStudents: number;
  overallAverageScore: number;
  overallPassRate: number;
  pendingApprovalsCount: number;
  classrooms: PerformanceClassroomDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — Student DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface PerformanceAttemptDto {
  attemptId: string;
  quizCode: string;
  lessonTitle: string;
  classroomName: string;
  subjectName: string;
  attemptNumber: number;
  finalScorePercent: number;
  isPassed: boolean;
  status: string;
  submittedAt: string | null;
}

export interface StudentPerformanceDetailDto {
  studentId: string;
  studentName: string;
  totalAttempts: number;
  completedAttempts: number;
  averageScorePercent: number;
  passRate: number;
  bestScorePercent: number;
  recentAttempts: PerformanceAttemptDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT SUMMARY — Dashboard overview of pending items
// ═══════════════════════════════════════════════════════════════════════════════

export interface UnattemptedAssessmentDto {
  assessmentId: string;
  code: string;
  title: string;
}

export interface UnattemptedQuizDto {
  lessonId: string;
  lessonTitle: string;
  quizCode: string;
  subjectName: string;
}

export interface UnwatchedLessonDto {
  lessonId: string;
  lessonTitle: string;
  subjectName: string;
}

export interface StudentSummaryCountsDto {
  unattemptedAssessments: number;
  unattemptedQuizzes: number;
  unwatchedLessons: number;
}

export interface StudentSummaryDto {
  unattemptedAssessments: UnattemptedAssessmentDto[];
  unattemptedQuizzes: UnattemptedQuizDto[];
  unwatchedLessons: UnwatchedLessonDto[];
  counts: StudentSummaryCountsDto;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT SUBJECT SCORES — Per-subject average for student
// ═══════════════════════════════════════════════════════════════════════════════

export interface StudentSubjectScoreDto {
  subjectId: string;
  subjectName: string;
  averageScore: number;
  quizCount: number;
  position: number;
  totalStudents: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT SUBTOPIC SCORES — Per-subtopic average for student
// ═══════════════════════════════════════════════════════════════════════════════

export interface StudentSubtopicScoreDto {
  subtopicId: string | null;
  subjectId: string;
  subjectName: string;
  subTopicName: string;
  averageScore: number;
  quizCount: number;
  position: number;
  totalStudents: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY COURSES — the student's own subject list + per-subject quiz/assessment
// performance (ranked against classmates for core subjects, or against other
// electees for minor subjects)
// ═══════════════════════════════════════════════════════════════════════════════

export interface MyCourseListItemDto {
  subjectId: string;
  subjectName: string;
  /** false = a core subject from the student's classroom. true = an elective. */
  isMinorSubject: boolean;
}

export interface MyCoursePerformanceStatDto {
  /** null means no completed attempts of this kind yet — render "No attempts yet", not "0%". */
  averageScore: number | null;
  attemptCount: number;
  /** null alongside averageScore when there are no attempts yet. */
  position: number | null;
  /** Size of the ranked pool being compared against — can legitimately be 1. */
  totalStudents: number;
}

export interface MyCourseDetailDto {
  subjectId: string;
  subjectName: string;
  isEnrolled: boolean;
  quiz: MyCoursePerformanceStatDto;
  assessment: MyCoursePerformanceStatDto;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT TOPIC PERFORMANCE — Topic & subtopic scores
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubjectSubtopicPerformanceDto {
  subTopicId: string;
  subTopicName: string;
  averageScore: number;
  quizCount: number;
}

export interface SubjectTopicPerformanceDto {
  topicId: string;
  topicName: string;
  averageScore: number | null;
  quizCount: number;
  subTopics: SubjectSubtopicPerformanceDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD — Comprehensive admin/super-admin performance data
// ═══════════════════════════════════════════════════════════════════════════════

export interface AdminDashboardOverviewDto {
  totalStudents: number;
  totalTeachers: number;
  totalClassrooms: number;
  totalSubjects: number;
  totalLessonsCreated: number;
  totalLessonsPublished: number;
  overallAverageScore: number;
  overallPassRate: number;
  totalLessonWatches: number;
  studentsWhoWatchedLessons: number;
}

export interface TeacherActivityDto {
  teacherId: string;
  teacherName: string;
  totalLessonsCreated: number;
  publishedLessons: number;
  draftLessons: number;
  pendingApprovalLessons: number;
  rejectedLessons: number;
  trustScore: number;
  trustLevel: string;
  lastLessonCreated: string;
}

export interface ClassroomPerformanceDto {
  classroomId: string;
  classroomName: string;
  studentCount: number;
  averageScorePercent: number;
  passRate: number;
  totalAttempts: number;
  completedAttempts: number;
  lessonWatchCount: number;
}

export interface SubjectPerformanceDto {
  subjectId: string;
  subjectName: string;
  averageScorePercent: number;
  passRate: number;
  totalAttempts: number;
  completedAttempts: number;
  studentCount: number;
}

export interface AdminDashboardData {
  computedAt: string;
  overview: AdminDashboardOverviewDto;
  teacherActivities: TeacherActivityDto[];
  classroomPerformances: ClassroomPerformanceDto[];
  subjectPerformances: SubjectPerformanceDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSROOM ASSESSMENT PERFORMANCE — Assessments assigned to a classroom
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassroomAssessmentPerformanceDto {
  assessmentId: string;
  code: string;
  title: string;
  classroomName: string;
  totalStudents: number;
  totalAttempts: number;
  completedAttempts: number;
  inProgressAttempts: number;
  averageScorePercent: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT PERFORMANCE — Classroom breakdown
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubjectClassroomPerformanceDto {
  classroomId: string;
  classroomName: string;
  studentCount: number;
  totalAttempts: number;
  completedAttempts: number;
  averageScorePercent: number;
  passRate: number;
  lastActivityDate: string | null;
  computedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const performanceService = {
  getNavbar: () =>
    API.get<TResponse<AdminNavbarDto | SubjectTeacherNavbarDto | ClassTeacherNavbarDto | StudentNavbarDto>>(
      "api/performance/navbar",
      { headers }
    ),

  getDashboard: () =>
    API.get<TResponse<SchoolPerformanceOverviewDto | TeacherPerformanceDashboardDto | StudentPerformanceDetailDto[]>>(
      "api/performance/dashboard",
      { headers }
    ),

  getClassroomPerformance: (classroomId: string) =>
    API.get<TResponse<PerformanceClassroomDto[]>>(
      `api/performance/classroom/${classroomId}`,
      { headers }
    ),

  getSubjectPerformance: (subjectId: string) =>
    API.get<TResponse<PerformanceSubjectDto[]>>(
      `api/performance/subject/${subjectId}`,
      { headers }
    ),

  refreshPerformance: () =>
    API.post<TResponse<null>>(
      "api/performance/refresh",
      null,
      { headers }
    ),

  getSubjectClassrooms: (subjectId: string) =>
    API.get<TResponse<SubjectClassroomPerformanceDto[]>>(
      `api/performance/subject/${subjectId}/classrooms`,
      { headers }
    ),

  getSubjectTopicPerformance: (subjectId: string, classroomId?: string) =>
    API.get<TResponse<SubjectTopicPerformanceDto[]>>(
      `api/performance/subject/${subjectId}/topics`,
      { headers, params: classroomId ? { classroomId } : {} }
    ),

  getStudentSummary: () =>
    API.get<TResponse<StudentSummaryDto>>(
      "api/performance/student-summary",
      { headers }
    ),

  getStudentSubjectScores: () =>
    API.get<TResponse<StudentSubjectScoreDto[]>>(
      "api/performance/student/subject-scores",
      { headers }
    ),

  getStudentSubtopicScores: () =>
    API.get<TResponse<StudentSubtopicScoreDto[]>>(
      "api/performance/student/subtopic-scores",
      { headers }
    ),

  getMyCourses: () =>
    API.get<TResponse<MyCourseListItemDto[]>>(
      "api/performance/my-courses",
      { headers }
    ),

  getMyCourseDetail: (subjectId: string) =>
    API.get<TResponse<MyCourseDetailDto>>(
      `api/performance/my-courses/${subjectId}`,
      { headers }
    ),

  getClassroomAssessmentPerformance: (classroomId: string) =>
    API.get<TResponse<ClassroomAssessmentPerformanceDto[]>>(
      `api/Assessment/classroom/${classroomId}/performance`,
      { headers }
    ),

  getStudentQuizPerformance: (studentId: string) =>
    API.get<TResponse<StudentPerformanceDetailDto>>(
      `api/performance/student/${studentId}/quiz-performance`,
      { headers }
    ),

  // ═══ Admin Dashboard ═══

  getAdminDashboard: () =>
    API.get<TResponse<AdminDashboardData>>(
      "api/performance/admin/dashboard",
      { headers }
    ),

  getAdminTeachers: (teacherId?: string) =>
    API.get<TResponse<TeacherActivityDto[]>>(
      "api/performance/admin/teachers",
      { headers, params: teacherId ? { teacherId } : {} }
    ),

  getAdminClassrooms: (classroomId?: string) =>
    API.get<TResponse<ClassroomPerformanceDto[]>>(
      "api/performance/admin/classrooms",
      { headers, params: classroomId ? { classroomId } : {} }
    ),

  getAdminSubjects: (subjectId?: string) =>
    API.get<TResponse<SubjectPerformanceDto[]>>(
      "api/performance/admin/subjects",
      { headers, params: subjectId ? { subjectId } : {} }
    ),
};
