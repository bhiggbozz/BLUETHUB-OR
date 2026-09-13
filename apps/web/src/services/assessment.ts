import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";
// import { X_Tenant_ID } from "@/utils/tenant";

const headers = { "X-Tenant-ID": getTenantFromUrl() };

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateAssessmentPayload {
  title: string;
  description: string;
  schoolId: string;
  timeLimitMinutes: number;
  shuffleQuestions: boolean;
  passMarkPercent: number;
  showResultImmediately: boolean;
  easyMarks: number;
  mediumMarks: number;
  hardMarks: number;
  examLevelMarks: number;
  expiresAt?: string | null;
  questionIds: string[];
}

export interface AssignAssessmentPayload {
  assessmentId: string;
  targetType: "Student" | "Subject" | "Classroom";
  targetIds: string[];
}

export interface AnswerBoard {
  boardSessionId: string;
  boardIndex: number;
  boardLabel: string;
}

export interface SubmitAnswerPayload {
  attemptId: string;
  questionId: string;
  selectedOptionId?: string | null;
  typedAnswer?: string | null;
  boardSessionId?: string | null;
  boards?: AnswerBoard[];
  audioUrl?: string | null;
  isSkipped: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface StudentAssessmentItem {
  assessmentId: string;
  code: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  questionCount: number;
  attemptNumber: number | null;
  finalScorePercent: number | null;
  isPassed: boolean | null;
  status: "NotStarted" | "InProgress" | "Completed";
  expiresAt?: string | null;
}

export interface AssessmentQuestionOption {
  questionId: string;
  optionId: string;
  optionLabel: string;
  optionText: string;
}

export interface AssessmentQuestion {
  questionId: string;
  title: string;
  textContent: string;
  questionType: number;
  difficultyLevel: number;
  marksAllocation: number;
  displayOrder: number;
  options: AssessmentQuestionOption[];
  imageUrl?: string | null;
  boardSnapshotUrl?: string | null;
}

export interface AssessmentDetail {
  assessmentId: string;
  code: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  passMarkPercent: number;
  shuffleQuestions: boolean;
  showResultImmediately: boolean;
  expiresAt?: string | null;
  questionCount: number;
  totalMarks: number;
  questions: AssessmentQuestion[];
}

export interface StartAttemptData {
  attemptId: string;
  attemptNumber: number;
  isOfficial: boolean;
  timeLimitMinutes: number;
  questions: AssessmentQuestion[];
}

export interface SubmitAttemptResult {
  attemptId: string;
  finalScorePercent: number;
  isPassed: boolean;
  totalMarks: number;
  marksObtained?: number;
  autoMarksObtained?: number;
  manualMarksObtained?: number;
  status: string;
  submittedAt: string;
}

export interface AnswerResult {
  questionId: string;
  questionType: number;
  maxMarks: number;
  marksObtained: number;
  isCorrect: boolean | null;
  typedAnswer: string | null;
  teacherFeedback: string | null;
  isSkipped: boolean;
}

export interface AttemptResult {
  attemptId: string;
  assessmentCode: string;
  title: string;
  attemptNumber: number;
  isOfficial: boolean;
  totalMarks: number;
  autoMarksObtained: number;
  manualMarksObtained: number;
  finalScorePercent: number;
  isPassed: boolean;
  status: string;
  submittedAt: string;
  answers: AnswerResult[];
}

export interface AttemptHistoryItem {
  attemptId: string;
  attemptNumber: number;
  isOfficial: boolean;
  status: string;
  finalScorePercent: number;
  isPassed: boolean;
  timeTakenSeconds: number;
  submittedAt: string;
}

export interface StudentAssessmentScoreDto {
  assessmentId: string;
  code: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number;
  questionCount: number;
  totalMarks: number;
  attemptId: string | null;
  attemptNumber: number | null;
  isOfficial: boolean | null;
  finalScorePercent: number | null;
  autoMarksObtained: number | null;
  manualMarksObtained: number | null;
  isPassed: boolean | null;
  status: "NotStarted" | "InProgress" | "Submitted" | "PartiallyGraded" | "FullyGraded";
  timeTakenSeconds: number | null;
  startedAt: string | null;
  submittedAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER LIST & ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TeacherAssessmentItem {
  assessmentId: string;
  code: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  passMarkPercent: number;
  shuffleQuestions: boolean;
  showResultImmediately: boolean;
  questionCount: number;
  totalMarks: number;
  expiresAt?: string | null;
  status: string;
  createdAt: string;
}

export interface AssessmentAssignmentItem {
  assignmentId: string;
  assessmentId: string;
  targetType: "Student" | "Subject" | "Classroom";
  targetId: string;
  targetName: string;
  assignedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuestionAnalyticsStat {
  questionId: string;
  questionTitle: string;
  questionType: number;
  maxMarks: number;
  subjectId: string;
  subjectName: string;
  topicId: string;
  // Empty string (not null) when the question has no topic assigned.
  topicName: string;
  averageMarksObtained: number;
  // % of attempts scoring EXACT full marks — partial credit doesn't count.
  successRate: number;
  // Students who actually answered this question; skipped/blank excluded.
  totalAttempts: number;
}

export interface AssessmentAnalytics {
  assessmentId: string;
  code: string;
  title: string;
  totalStudents: number;
  totalAttempts: number;
  averageScore: number;
  // % of attempts where IsPassed = true (the assessment's own pass mark) —
  // not question-level, don't confuse with a per-question successRate.
  passRate: number;
  // Pre-sorted successRate ascending (worst-first) by the backend. Only
  // includes questions with at least one answered attempt — a question with
  // zero attempts is simply absent (SQL GROUP BY, not a full question list).
  perQuestionStats: QuestionAnalyticsStat[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADING DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface PendingGradeStroke {
  id: string;
  type: string;
  data: string;
  color: string;
  width: number;
  currentBoard: number;
  timestamp: number;
  duration: number;
  startTime: string;
  endTime: string;
}

export interface PendingGradeBoard {
  boardIndex: number;
  strokeCount: number;
  strokes: PendingGradeStroke[];
}

export interface PendingGradeItem {
  answerId: string;
  attemptId: string;
  assessmentId: string;
  assessmentCode: string;
  assessmentTitle: string;
  studentName: string;
  questionId: string;
  questionTitle: string;
  questionText: string;
  questionType: number;
  maxMarks: number;
  typedAnswer: string;
  boardSessionId: string | null;
  audioUrl: string | null;
  isSkipped: boolean;
  attemptStatus: string;
  boards?: PendingGradeBoard[];
}

export interface GradeAnswerPayload {
  manualMarksObtained: number;
  teacherFeedback: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const assessmentService = {
  create: (payload: CreateAssessmentPayload) =>
    API.post<TResponse<null>>("api/Assessment/create", payload, { headers }),

  assign: (payload: AssignAssessmentPayload) =>
    API.post<TResponse<null>>("api/Assessment/assign", payload, { headers }),

  getStudentList: () =>
    API.get<TResponse<StudentAssessmentItem[]>>("api/Assessment/student/list", { headers }),

  getStudentScores: () =>
    API.get<TResponse<StudentAssessmentScoreDto[]>>("api/Assessment/student/scores", { headers }),

  getDetail: (assessmentId: string) =>
    API.get<TResponse<AssessmentDetail>>(`api/Assessment/${assessmentId}/detail`, { headers }),

  getDetailByCode: (code: string) =>
    API.get<TResponse<AssessmentDetail>>(`api/Assessment/code/${encodeURIComponent(code)}/detail`, { headers }),

  startAttempt: (assessmentId: string) =>
    API.post<TResponse<StartAttemptData>>(`api/Assessment/${assessmentId}/start`, null, { headers }),

  submitAnswer: (payload: SubmitAnswerPayload) =>
    API.post<TResponse<null>>("api/Assessment/answer", payload, { headers }),

  submitAttempt: (attemptId: string) =>
    API.post<TResponse<SubmitAttemptResult>>(`api/Assessment/${attemptId}/submit`, {}, { headers }),

  submitAll: (payload: { answers: SubmitAnswerPayload[] }) =>
    API.post<TResponse<SubmitAttemptResult>>("api/Assessment/submit-all", payload, { headers }),

  getResult: (attemptId: string) =>
    API.get<TResponse<AttemptResult>>(`api/Assessment/result/${attemptId}`, { headers }),

  getHistory: (assessmentId: string) =>
    API.get<TResponse<AttemptHistoryItem[]>>(`api/Assessment/${assessmentId}/history`, { headers }),

  getTeacherList: () =>
    API.get<TResponse<TeacherAssessmentItem[]>>("api/Assessment/teacher/list", { headers }),

  getAssignments: (assessmentId: string) =>
    API.get<TResponse<AssessmentAssignmentItem[]>>(`api/Assessment/${assessmentId}/assignments`, { headers }),

  getAnalytics: (assessmentId: string) =>
    API.get<TResponse<AssessmentAnalytics>>(`api/Assessment/${assessmentId}/analytics`, { headers }),

  getPendingGradings: () =>
    API.get<TResponse<PendingGradeItem[]>>("api/Assessment/grading/pending", { headers }),

  gradeAnswer: (answerId: string, payload: GradeAnswerPayload) =>
    API.post<TResponse<unknown>>(`api/Assessment/grading/${answerId}/grade`, payload, { headers }),
};
