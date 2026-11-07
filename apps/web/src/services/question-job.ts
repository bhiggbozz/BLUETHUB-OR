import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";

// ── Enums ───────────────────────────────────────────────────────────────────
export const JobStatusEnum = {
  Pending: "Pending",
  Processing: "Processing",
  Completed: "Completed",
  PartiallyCompleted: "PartiallyCompleted",
  Failed: "Failed",
} as const;
export type JobStatusEnum = (typeof JobStatusEnum)[keyof typeof JobStatusEnum];

// ── Request types ───────────────────────────────────────────────────────────
export type JobQuestionType = "Objective" | "Theory" | "TrueFalse";

// ── Response types ──────────────────────────────────────────────────────────
export interface SubmitJobResponse {
  jobId: string;
  responseMessage: string;
  responseCode: string;
  status: string;
}

export interface JobSummaryDto {
  jobId: string;
  questionType: JobQuestionType;
  status: JobStatusEnum;
  questionId: string | null;
  failureReason: string;
  createdAt: string;
  completedAt: string;
  topicName?: string;
  subTopicName?: string;
  extractedCount?: number;
  attemptCount?: number;
  /** The classroom/subject/topic/sub-topic IDs chosen at scan-submit time
   * (see questionJobService.submitJob). Not every backend version returns
   * these yet — when absent, the save flow falls back to re-matching
   * topicName/subTopicName against the currently selected classroom's
   * curriculum, which is why picking a sub-topic can seem to be asked for
   * twice. Once the backend echoes these back, saving skips that re-match
   * entirely. */
  classroomId?: string;
  subjectId?: string;
  topicId?: string;
  subTopicId?: string;
}

export interface JobListItem {
  jobId: string;
  fileName: string;
  fileType: "pdf" | "image";
  subjectName: string;
  questionsExtracted?: number;
  status: JobStatusEnum;
  createdAt: string;
  completedAt?: string | null;
  failureReason?: string | null;
}

export interface JobListResponse {
  jobs: JobSummaryDto[];
  totalCount: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  responseMessage: string;
  responseCode: string;
  status: string;
}

export interface OptionPreviewDto {
  id: string;
  optionLabel: string;
  optionText: string;
  optionHtml: string;
  contentParts: unknown;
  isCorrect: boolean;
  hasLatex: boolean;
  hasImages: boolean;
  orderIndex: number;
}

export interface ExtractedQuestionPreview {
  questionId?: string;
  questionNumber?: number;
  title?: string;
  textContent?: string;
  questionHtml?: string;
  contentParts?: unknown;
  hasLatex?: boolean;
  hasImages?: boolean;
  isPartial?: boolean;
  questionType: number | string;
  difficultyLevel: number | string;
  marksAllocation: number;
  aiConfidenceScore?: number;
  status?: string;
  options: OptionPreviewDto[];
  // What this question is actually filed under right now — always prefer
  // these over the job-level ids below when both are present.
  classroomId?: string;
  subjectId?: string;
  topicId?: string;
  subTopicId?: string;
}

export interface JobPreviewResponseData {
  scanSessionId?: string;
  fileUrl?: string;
  jobId: string;
  questions: ExtractedQuestionPreview[];
  totalCount?: number;
  totalExtracted?: number;
  status: string;
  // The classroom/subject/topic/sub-topic chosen at scan-submit time
  // (POST api/questionjob/submit) and stored on the job — the review
  // screen displays these read-only and uses the ids for saving instead of
  // asking the teacher to pick again. topicId/topicName can be empty on
  // older jobs; the rest are expected to always be present.
  classroomId?: string;
  classroomName?: string;
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
  topicName?: string;
  subTopicId?: string;
  subTopicName?: string;
}

export interface QuestionPreviewResponse {
  questionId: string;
  jobId: string;
  questionType: JobQuestionType;
  questionHtml: string;
  contentParts: unknown;
  options: OptionPreviewDto[];
  hasLatex: boolean;
  hasImages: boolean;
  difficultyLevel: string;
  marksAllocation: number;
  status: string;
  responseMessage: string;
  responseCode: string;
}

const headers = { "X-Tenant-ID": getTenantFromUrl() };

export const questionJobService = {
  // POST api/questionjob/submit — multipart/form-data
  submitJob: (formData: FormData) =>
    API.post<TResponse<SubmitJobResponse>>("api/questionjob/submit", formData, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    }),

  // Alias used by scan-upload-modal
  submitScanJob: (payload: {
    subjectId: string;
    fileUrl: string;
    filePublicId: string;
    fileName: string;
    fileType: "image" | "pdf";
  }) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
    return API.post<TResponse<SubmitJobResponse>>("api/questionjob/submit", formData, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });
  },

  // GET api/questionjob/my-jobs
  getMyJobs: (params?: { pageSize?: number; page?: number }) =>
    API.get<JobListResponse>("api/questionjob/my-jobs", {
      headers,
      params,
    }),

  // GET api/questionjob/{jobId}/preview
  getJobPreview: (jobId: string) =>
    API.get<TResponse<JobPreviewResponseData>>(
      `api/questionjob/${jobId}/preview`,
      { headers }
    ),

  // POST api/questionjob/{jobId}/retry
  retryJob: (arg: string | { jobId: string }) => {
    const jobId = typeof arg === "string" ? arg : arg.jobId;
    return API.post<TResponse<unknown>>(`api/questionjob/${jobId}/retry`, {}, { headers });
  },

  // POST api/questionjob/jobs/{jobId}/confirm — closes the whole job once
  // every question in it has been approved or rejected. Not per-question.
  confirmJob: (jobId: string) =>
    API.post<TResponse<unknown>>(`api/questionjob/jobs/${jobId}/confirm`, {}, { headers }),

  // POST api/questions/{questionId}/confirm — approve a single extracted
  // question (adds it to the question bank).
  approveQuestion: (questionId: string) =>
    API.post<TResponse<unknown>>(`api/questions/${questionId}/confirm`, {}, { headers }),

  // POST api/questions/{questionId}/reject — soft-deletes a single
  // extracted question. `reason` is the teacher's free-text explanation
  // from the reject dialog; omit it if blank.
  rejectQuestion: (questionId: string, reason?: string) =>
    API.post<TResponse<unknown>>(
      `api/questions/${questionId}/reject`,
      reason?.trim() ? { reason: reason.trim() } : {},
      { headers }
    ),
};

