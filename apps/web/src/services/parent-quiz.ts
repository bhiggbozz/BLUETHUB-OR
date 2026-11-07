import { API, type TResponse } from ".";
import { getTenantFromUrl } from "@/utils/subdomain";

const headers = { "X-Tenant-ID": getTenantFromUrl() };

// ── Backend contract (Bearer + X-Tenant-ID on every call) ─────────────────────
//   Parent (role Parent only):
//     GET    /api/parent-quiz/children/{studentId}/subjects
//     GET    /api/parent-quiz/settings
//     PUT    /api/parent-quiz/settings
//     POST   /api/parent-quiz
//     GET    /api/parent-quiz?studentId=
//     GET    /api/parent-quiz/{quizId}/result
//     DELETE /api/parent-quiz/{quizId}
//   Student (role Student only):
//     GET    /api/student/parent-quiz
//     POST   /api/student/parent-quiz/{quizId}/start
//     POST   /api/student/parent-quiz/{quizId}/submit
//     GET    /api/student/parent-quiz/{quizId}/result
//
//   Completely separate from teacher assessments/quizzes — its own endpoints,
//   never the teacher assessment ones. All JSON camelCase; timestamps UTC ISO.
// ────────────────────────────────────────────────────────────────────────────

export type ParentQuizMode = "Mix" | "Easy" | "Medium" | "Hard" | "ExamLevel";
export type ParentQuizStatus = "Pending" | "InProgress" | "Completed";

export interface ParentQuizAvailability {
  easy: number;
  medium: number;
  hard: number;
  examLevel: number;
  total: number;
}

export interface ParentQuizSubTopicDto {
  subTopicId: string;
  name: string;
  available: ParentQuizAvailability;
}

export interface ParentQuizTopicDto {
  topicId: string;
  name: string;
  available: ParentQuizAvailability;
  /** Reliable counts live here — a topic's own `available` can be lower than
   * the sum of its sub-topics, since some questions are filed under a
   * different topic. Only present on schools using sub-topic granularity;
   * absent or empty means pick at the topic level instead. */
  subTopics?: ParentQuizSubTopicDto[];
}

export interface ParentQuizSubjectDto {
  subjectId: string;
  name: string;
  available: ParentQuizAvailability;
  topics: ParentQuizTopicDto[];
}

export interface ParentQuizSettingsDto {
  questionCount: number;
  mode: ParentQuizMode;
  timeLimitMinutes: number | null;
  passMarkPercent: number;
  shuffleQuestions: boolean;
  isCustomised: boolean;
}

export type ParentQuizSettingsPayload = Omit<ParentQuizSettingsDto, "isCustomised">;

export interface CreateParentQuizPayload {
  studentId: string;
  subjectId: string;
  topicIds?: string[];
  /** Questions matching either topicIds or subTopicIds qualify — the two can be sent together. */
  subTopicIds?: string[];
  title?: string;
  questionCount?: number;
  mode?: ParentQuizMode;
  /** omit = use the saved default; 0 = no time limit for this quiz only */
  timeLimitMinutes?: number;
  passMarkPercent?: number;
}

export interface ParentQuizSummaryDto {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  title: string;
  subjectName: string;
  topicNames: string | null;
  mode: ParentQuizMode;
  questionCount: number;
  timeLimitMinutes: number | null;
  passMarkPercent: number;
  status: ParentQuizStatus;
  createdAt: string;
  completedAt: string | null;
  scorePercent: number | null;
  isPassed: boolean | null;
  totalCorrect: number | null;
}

export interface CreateParentQuizResponse {
  quiz: ParentQuizSummaryDto;
  notice: string | null;
}

export interface ParentQuizOptionDto {
  optionId: string;
  optionLabel: string;
  optionText: string;
  optionHtml: string | null;
  contentParts: unknown;
  hasLatex: boolean;
  orderIndex: number;
}

export interface ParentQuizQuestionDto {
  questionId: string;
  displayOrder: number;
  title: string;
  textContent: string | null;
  questionHtml: string | null;
  contentParts: unknown;
  hasLatex: boolean;
  imageUrl: string | null;
  /** 1 = multiple choice, 4 = true/false */
  questionType: number;
  difficultyLevel: number;
  options: ParentQuizOptionDto[];
}

export interface StartParentQuizDto {
  quizId: string;
  attemptId: string;
  title: string;
  timeLimitMinutes: number | null;
  startedAt: string;
  questions: ParentQuizQuestionDto[];
}

export interface SubmitParentQuizAnswer {
  questionId: string;
  selectedOptionId: string | null;
}

export interface SubmitParentQuizPayload {
  answers: SubmitParentQuizAnswer[];
}

export interface ParentQuizResultOptionDto {
  optionId: string;
  optionLabel: string;
  optionText: string;
  optionHtml: string | null;
  contentParts: unknown;
  hasLatex: boolean;
  isCorrect: boolean;
  wasSelected: boolean;
}

export interface ParentQuizResultQuestionDto {
  questionId: string;
  displayOrder: number;
  title: string;
  textContent: string | null;
  questionHtml: string | null;
  contentParts: unknown;
  hasLatex: boolean;
  imageUrl: string | null;
  difficultyLevel: number;
  isCorrect: boolean;
  isSkipped: boolean;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  options: ParentQuizResultOptionDto[];
}

export interface ParentQuizResultDto {
  quiz: ParentQuizSummaryDto;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalSkipped: number;
  timeTakenSeconds: number | null;
  questions: ParentQuizResultQuestionDto[];
}

export const parentQuizService = {
  // ── Parent ───────────────────────────────────────────────────────────────
  getChildSubjects: (studentId: string) =>
    API.get<TResponse<ParentQuizSubjectDto[]>>(
      `/api/parent-quiz/children/${studentId}/subjects`,
      { headers },
    ),

  getSettings: () =>
    API.get<TResponse<ParentQuizSettingsDto>>("/api/parent-quiz/settings", { headers }),

  saveSettings: (payload: ParentQuizSettingsPayload) =>
    API.put<TResponse<ParentQuizSettingsDto>>("/api/parent-quiz/settings", payload, { headers }),

  createQuiz: (payload: CreateParentQuizPayload) =>
    API.post<TResponse<CreateParentQuizResponse>>("/api/parent-quiz", payload, { headers }),

  /** All of the parent's quizzes (every child) when studentId is omitted. */
  getQuizzes: (studentId?: string) =>
    API.get<TResponse<ParentQuizSummaryDto[]>>("/api/parent-quiz", {
      params: studentId ? { studentId } : undefined,
      headers,
    }),

  getQuizResult: (quizId: string) =>
    API.get<TResponse<ParentQuizResultDto>>(`/api/parent-quiz/${quizId}/result`, { headers }),

  cancelQuiz: (quizId: string) =>
    API.delete<TResponse<null>>(`/api/parent-quiz/${quizId}`, { headers }),

  // ── Student ──────────────────────────────────────────────────────────────
  getMyQuizzes: () =>
    API.get<TResponse<ParentQuizSummaryDto[]>>("/api/student/parent-quiz", { headers }),

  /** Starts the quiz, or resumes an in-progress one with the same attemptId/questions. */
  startQuiz: (quizId: string) =>
    API.post<TResponse<StartParentQuizDto>>(
      `/api/student/parent-quiz/${quizId}/start`,
      null,
      { headers },
    ),

  submitQuiz: (quizId: string, payload: SubmitParentQuizPayload) =>
    API.post<TResponse<ParentQuizResultDto>>(
      `/api/student/parent-quiz/${quizId}/submit`,
      payload,
      { headers },
    ),

  getMyQuizResult: (quizId: string) =>
    API.get<TResponse<ParentQuizResultDto>>(`/api/student/parent-quiz/${quizId}/result`, { headers }),
};

export default parentQuizService;
