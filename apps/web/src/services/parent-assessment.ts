import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";

const headers = { "X-Tenant-ID": getTenantFromUrl() };

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TaughtTopic {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  lastTaughtDate: string;
  timesTaught: number;
}

export interface TaughtTopicsResponseData {
  topics: TaughtTopic[];
}

export interface DifficultyAvailability {
  difficultyLevel: number;
  difficultyLevelName: string;
  availableCount: number;
}

export interface QuestionAvailabilityResponseData {
  byDifficulty: DifficultyAvailability[];
}

export interface DifficultySelection {
  difficultyLevel: number;
  count: number;
}

export interface QuickCreatePayload {
  topicIds: string[];
  difficultySelections: DifficultySelection[];
  title?: string;
  timeLimitMinutes?: number;
  passMarkPercent?: number;
  showResultImmediately?: boolean;
  showCorrectAnswers?: boolean;
  expiresAt?: string | null;
}

export interface QuickCreateDifficultyResult {
  difficultyLevel: number;
  difficultyLevelName: string;
  requested: number;
  included: number;
}

export interface QuickCreateResponseData {
  assessmentId: string;
  code: string;
  title: string;
  totalQuestions: number;
  byDifficulty: QuickCreateDifficultyResult[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const parentAssessmentService = {
  getTaughtTopics: (studentId: string, fromDate: string, toDate: string) =>
    API.get<TResponse<TaughtTopicsResponseData>>(
      `/api/ParentAssessment/children/${studentId}/taught-topics`,
      { params: { fromDate, toDate }, headers },
    ),

  getQuestionAvailability: (studentId: string, topicIds: string[]) =>
    API.post<TResponse<QuestionAvailabilityResponseData>>(
      `/api/ParentAssessment/children/${studentId}/question-availability`,
      { topicIds },
      { headers },
    ),

  quickCreate: (studentId: string, payload: QuickCreatePayload) =>
    API.post<TResponse<QuickCreateResponseData>>(
      `/api/ParentAssessment/children/${studentId}/quick-create`,
      payload,
      { headers },
    ),
};

export default parentAssessmentService;
