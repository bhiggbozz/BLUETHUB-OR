import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";
// import { X_Tenant_ID } from "./school";

const X_Tenant_ID = getTenantFromUrl()

export const QuestionTypeEnum = {
  MultipleChoice: 1,
  ShortAnswer: 2,
  Essay: 3,
  TrueOrFalse: 4,
  FillInTheBlank: 5,
  ImageBased: 6,
  BoardBased: 7,
  Mixed: 8,
} as const;

export const DifficultyLevelEnum = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
  Expert: 4,
} as const;

export const QuestionStatusEnum = {
  Draft: 1,
  Published: 2,
  PendingReview: 3,
  Archived: 4,
} as const;
export type QuestionStatusEnum = (typeof QuestionStatusEnum)[keyof typeof QuestionStatusEnum];

export const ConflictResolutionEnum = {
  KeepLocal: 1,
  KeepServer: 2,
  KeepMerged: 3,
  DiscardLocal: 4,
} as const;
export type ConflictResolutionEnum = (typeof ConflictResolutionEnum)[keyof typeof ConflictResolutionEnum];

// ═══════════════════════════════════════════════════════════════════════════════
// PAYLOADS (Request DTOs)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateOptionPayload {
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface CreateQuestionPayload {
  clientId: string;
  originDevice: string;
  createdAtDevice: string;
  subjectId: string;
  topicId?: string | null;
  topic: string;
  subTopic: string;
  title: string;
  textContent: string;
  questionType: number;
  difficultyLevel: number;
  marksAllocation: number;
  correctAnswer?: string | null;
  options: CreateOptionPayload[];
  boardSessionId?: string | null;
  snapshotUrl?: string | null;
  snapshotPublicId?: string | null;
  scanSessionId?: string | null;
  isScanned: boolean;
  extractedQuestionIndex?: number | null;
  aiConfidenceScore?: string | null;
  classroomId: string;
  imageUrl?: string | null;
  imagePublicId?: string | null;
}

// POST /api/questions/batch's response — flat, not wrapped in TResponse<T>'s
// `.data`. `data` is always null; the actual results live alongside the
// envelope fields.
export interface BatchCreateQuestionsResponse {
  results: { clientId: string; questionId?: string; success: boolean; errorMessage?: string | null; isDuplicate?: boolean }[];
  totalCount: number;
  successCount: number;
  failedCount: number;
  responseMessage: string;
  responseCode: string;
  status: string;
  data: null;
}

export interface UpdateQuestionPayload {
  questionId: string;
  clientId?: string;
  title: string;
  subjectId: string;
  topicId?: string | null;
  topic?: string;
  subTopic?: string;
  textContent?: string;
  questionType: number;
  difficultyLevel: number;
  marksAllocation: number;
  options?: CreateOptionPayload[];
  boardSessionId?: string | null;
  lastKnownModifiedDate?: string;
}

export interface QuestionFilterPayload {
  page?: number;
  pageSize?: number;
  questionType?: number;
  difficultyLevel?: number;
  status?: number;
  searchText?: string;
  includePendingReview?: boolean;
  scanSessionId?: string;
}

export interface SyncQuestionPayload {
  clientId: string;
  serverId?: string;
  title: string;
  subjectId: string;
  topicId?: string | null;
  topic?: string;
  subTopic?: string;
  textContent?: string;
  questionType: number;
  difficultyLevel: number;
  marksAllocation: number;
  options?: CreateOptionPayload[];
  boardSessionId?: string | null;
  localModifiedAt: string;
  isNewQuestion: boolean;
}

export interface SyncQuestionsPayload {
  questions: SyncQuestionPayload[];
}

export interface ConflictCheckPayload {
  questions: Array<{
    clientId: string;
    serverId?: string;
    localModifiedAt: string;
  }>;
}

export interface ResolveConflictPayload {
  questionId: string;
  clientId?: string;
  resolution: ConflictResolutionEnum;
  mergedData?: UpdateQuestionPayload;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateQuestionResponseData {
  questionId: string;
  clientId: string;
  isDuplicate: boolean;
}

export interface UpdateQuestionResponseData {
  questionId: string;
  clientId?: string;
  newModifiedDate: string;
  isConflict?: boolean;
  conflictDetail?: ConflictDetail;
}

export interface ConflictDetail {
  clientId?: string;
  serverId: string;
  reason: string;
  reasonDescription: string;
  serverModifiedAt: string;
  localModifiedAt: string;
  serverVersion?: QuestionDto;
}

export interface OptionDto {
  id: string;
  optionLabel: string;
  optionText: string;
  isCorrect?: boolean; // Hidden for students
  orderIndex: number;
}

export interface QuestionDto {
  id: string;
  clientId?: string;
  schoolId: string;
  subjectId: string;
  subjectName?: string;
  topicId?: string;
  topic?: string;
  subTopic?: string;
  createdBy: string;
  createdByName?: string;
  title: string;
  textContent?: string;
  questionType: number;
  difficultyLevel: number;
  marksAllocation: number;
  hasBoardSession: boolean;
  boardSessionId?: string;
  hasMedia: boolean;
  imageUrl?: string;
  hasAudio: boolean;
  isScanned: boolean;
  scanSessionId?: string;
  status: number;
  creationDate: string;
  modifiedDate?: string;
  options: OptionDto[];
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

export interface QuestionSummaryDto {
  id: string;
  clientId?: string;
  title: string;
  topic?: string;
  topicName?: string;
  subTopicName?: string;
  subjectName?: string;
  questionType: number;
  questionTypeName?: string;
  difficultyLevel: number;
  difficultyLevelName?: string;
  marksAllocation: number;
  hasBoardSession: boolean;
  hasMedia: boolean;
  hasAudio: boolean;
  isScanned: boolean;
  status: number;
  statusName?: string;
  creationDate: string;
  imageUrl?: string | null;
  boardSnapshotUrl?: string | null;
}

export interface QuestionDetailResponseData {
  question: QuestionDto;
}

export interface QuestionListResponseData {
  questions: QuestionSummaryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface QuestionListResponse {
  responseCode: string;
  responseMessage: string;
  status: string;
  questions: QuestionSummaryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SubTopicSummary {
  subTopicId: string;
  subTopicName: string;
  questionCount: number;
  draftCount: number;
  publishedCount: number;
  pendingReviewCount: number;
}

export interface TopicSummary {
  topicId: string;
  topicName: string;
  questionCount: number;
  subTopics: SubTopicSummary[];
}

export interface SubjectQuestionSummaryResponseData {
  subjectId: string;
  subjectName?: string;
  totalCount: number;
  totalQuestions: number;
  statusSummary?: {
    published: number;
    draft: number;
    pendingReview: number;
    archived: number;
  };
  topics: TopicSummary[];
  difficultyBreakdown?: { difficultyLevel: number; difficultyLevelName: string; questionCount: number }[];
  typeBreakdown?: { questionType: number; questionTypeName: string; questionCount: number }[];
}

export interface PendingReviewResponseData {
  scanSession: {
    id: string;
    originalFileUrl: string;
    fileName: string;
    uploadedAt: string;
  };
  questions: QuestionDto[];
  totalCount: number;
}

export interface SyncResultItem {
  clientId: string;
  serverId?: string;
  success: boolean;
  error?: string;
  isDuplicate?: boolean;
}

export interface SyncResponseData {
  results: SyncResultItem[];
  successCount: number;
  failedCount: number;
}

export interface ConflictCheckItem {
  clientId: string;
  serverId?: string;
  hasConflict: boolean;
  serverModifiedAt?: string;
}

export interface ConflictCheckResponseData {
  safeToSync: ConflictCheckItem[];
  conflicts: ConflictCheckItem[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const questionService = {
  // ── CREATE ─────────────────────────────────────────────────────────────────
  createQuestion: (payload: CreateQuestionPayload) =>
    API.post<TResponse<CreateQuestionResponseData>>(
      "api/questions/createquestions",
      payload,
      {
        headers: { "X-Tenant-ID": X_Tenant_ID },
      },
    ),

  // NOT a standard TResponse<T> — results/totalCount/successCount/failedCount
  // come back at the top level alongside responseMessage/responseCode/status,
  // with `data` always null. Don't reach into `.data` for these fields.
  createQuestionsBatch: (payloads: CreateQuestionPayload[]) =>
    API.post<BatchCreateQuestionsResponse>(
      "api/questions/batch",
      { questions: payloads },
      {
        headers: { "X-Tenant-ID": X_Tenant_ID },
      },
    ),

  // ── QUERY ──────────────────────────────────────────────────────────────────
  getQuestionsByClassroom: (
    classroomId: string,
    filter?: {
      page?: number;
      pageSize?: number;
      subjectId?: string;
      topicId?: string;
      subTopicIds?: string[];
      questionType?: number;
      difficultyLevel?: number;
      status?: number;
      searchText?: string;
      includePendingReview?: boolean;
      scanSessionId?: string;
    },
  ) =>
    API.post<TResponse<QuestionListResponseData>>(
      `api/questions/classroom/${classroomId}/questions`,
      filter ?? {},
      {
        headers: { "X-Tenant-ID": X_Tenant_ID },
      },
    ),

  getQuestionsByClassroomSubjectTopic: (
    classroomId: string,
    subjectId: string,
    topicId: string,
    filter?: {
      page?: number;
      pageSize?: number;
      subTopicIds?: string[];
      status?: number;
      searchText?: string;
    },
  ) =>
    API.get<TResponse<QuestionListResponseData>>(
      `api/questions/classroom/${classroomId}/subject/${subjectId}/topic/${topicId}`,
      {
        params: filter,
        headers: { "X-Tenant-ID": X_Tenant_ID },
      },
    ),

  getQuestionsByClassroomSubject: (
    classroomId: string,
    subjectId: string,
    params?: { page?: number; pageSize?: number; questionType?: number; difficultyLevel?: number; searchText?: string },
  ) =>
    API.get<QuestionListResponse>(
      `api/questions/classroom/${classroomId}/subject/${subjectId}`,
      { params, headers: { "X-Tenant-ID": X_Tenant_ID } },
    ),

  getQuestionsByClassroomSubjectSubTopic: (
    classroomId: string,
    subjectId: string,
    subTopicId: string,
    params?: { page?: number; pageSize?: number; questionType?: number; difficultyLevel?: number; searchText?: string },
  ) =>
    API.get<QuestionListResponse>(
      `api/questions/classroom/${classroomId}/subject/${subjectId}/subtopic/${subTopicId}`,
      { params, headers: { "X-Tenant-ID": X_Tenant_ID } },
    ),

  getQuestionsBySubjectSubTopic: (
    subjectId: string,
    subTopicId: string,
    params?: { page?: number; pageSize?: number; questionType?: number; difficultyLevel?: number; searchText?: string },
  ) =>
    API.get<QuestionListResponse>(
      `api/questions/subject/${subjectId}/subtopic/${subTopicId}`,
      { params, headers: { "X-Tenant-ID": X_Tenant_ID } },
    ),

  getSubjectQuestionSummary: (
    classroomId: string,
    subjectId: string,
    subTopicId?: string,
  ) =>
    API.get<TResponse<SubjectQuestionSummaryResponseData>>(
      `api/questions/classroom/${classroomId}/subject/${subjectId}/summary`,
      {
        params: subTopicId ? { subTopicId } : undefined,
        headers: { "X-Tenant-ID": X_Tenant_ID },
      },
    ),
};

export default questionService;
