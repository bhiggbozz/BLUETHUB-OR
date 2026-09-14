import { API, type TResponse } from ".";

import type { IActions, CompressedStroke, SessionManifest } from "@/utils/constant";
import { getTenantFromUrl } from "@/utils/subdomain";

// import { X_Tenant_ID } from "@/utils/tenant";

const X_Tenant_ID = getTenantFromUrl()

export interface CloudinarySignature {
  resourceType: string;
  signature: string;
  apiKey: string;
  cloudName: string;
  timestamp: number;
  folder: string;
  uploadPreset?: string | null;
}

export interface SupabaseUploadToken {
  uploadUrl: string;
  publicUrl: string;
  token: string;
  bucketPath: string;
  bucket: string;
}

// Matches C# enum: Audio=1, Video=2, Document=3, Image=4
export const LessonMediaType = {
  Audio: 1,
  Video: 2,
  Document: 3,
  Image: 4,
} as const;
export type LessonMediaTypeValue = typeof LessonMediaType[keyof typeof LessonMediaType];

export function resolveMediaType(mimeType: string): number {
  if (mimeType.startsWith("audio/")) return LessonMediaType.Audio;
  if (mimeType.startsWith("video/")) return LessonMediaType.Video;
  if (mimeType.startsWith("image/")) return LessonMediaType.Image;
  return LessonMediaType.Document;
}

export interface MediaFilePayload {
  fileName: string;
  originalFileName: string;
  fileExtension: string;
  mediaType: number;
  cloudinaryUrl: string;
  publicId: string;
  fileSizeBytes: number;
  duration?: number;
  displayOrder: number;
}

export interface SubmitLessonPayload {
  classroomId: string;
  subjectId: string;
  topicId: string;
  subTopicId: string;
  subTopic: string;
  aim: string;
  description: string;
  mediaFiles: MediaFilePayload[];
  quizId?: string | null;
  accessDate?: string | null;
  accessTime?: string | null;
  durationMinutes?: number | null;
  // ── AI material generation (optional; default shouldGenerateImage=true, imageCount=1) ──
  shouldGenerateImage?: boolean;
  imageMaterialWords?: string | null;
  imageCount?: number | null;
}

// Draft: all metadata fields required, media optional (backend has [Required] commented out)
export type DraftLessonPayload = Omit<SubmitLessonPayload, "mediaFiles"> & {
  mediaFiles?: MediaFilePayload[];
};

export interface LessonTopic {
  id: string;
  name: string;
}

export interface LessonSubTopic {
  id: string;
  name: string;
}

export interface SubmitLessonResponse {
  lessonId: string;
  status: string;
  mediaCount: number;
  approvalId?: string;
}

export interface LessonItem {
  id: string;
  schoolId: string;
  classroomId: string;
  subjectId: string;
  topicId: string;
  subjectName?: string;
  topicName?: string;
  subTopicName?: string;
  className?: string;
  subTopic: string;
  aim: string;
  description: string;
  accessDate?: string | null;
  accessTime?: string | null;
  durationMinutes?: number | null;
  accessEndsAt?: string | null;
  isAccessOpen?: boolean;
  status: string;
  createdBy: string;
  approvedBy: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  modifiedAt: string;
  approvedAt: string | null;
  quizId?: string | null;
}

export interface LessonSummary {
  total: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  published: number;
}

export interface MyLessonsData {
  summary: LessonSummary;
  lessons: LessonItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  filteredBy: string;
}

export interface SubmitManifestPayload {
  sessionId: string;
  manifest: IActions;
}

export interface SubmitManifestResponse {
  sessionId: string;
  status: string;
}

// ── Sync Architecture Types ──────────────────────────────────────────────────

export interface StrokeBatchPayload {
  lessonId: string;
  sessionId: string;
  batchIndex: number;
  startMs: number;
  endMs: number;
  strokes: CompressedStroke[];
  strokeCount: number;
}

export interface SessionManifestPayload {
  lessonId: string;
  sessionId: string;
  manifest: SessionManifest;
}

export interface AudioChunkMetadata {
  lessonId: string;
  sessionId: string;
  chunkIndex: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  sizeBytes: number;
}

// ── Approval Types ───────────────────────────────────────────────────────────

export interface LessonSummaryDto {
  lessonId: string;
  aim: string;
  description: string;
  subjectName: string;
  topicName: string;
  subTopic?: string;
  subTopicName?: string;
  className: string;
  mediaCount: number;
}

export interface ApprovalItemDto {
  id: string;
  operationType: string;
  entityType: string;
  entityId: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  requestedByName: string;
  requestedByEmail: string;
  lesson: LessonSummaryDto | null;
  rejectionReason?: string | null;
  respondedAt?: string | null;
}

export interface PendingApprovalsResponse {
  count: number;
  items: ApprovalItemDto[];
}

export interface ApprovalRespondPayload {
  approved: boolean;
  rejectionReason?: string;
}

// ── Lesson for Class Types ───────────────────────────────────────────────────

export interface LessonForClassDto {
  id: string;
  aim: string;
  description: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  subTopic: string;
  subTopicId: string;
  classroomId: string;
  name: string;
  className: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  approvedByName: string | null;
  accessDate: string | null;
  accessTime: string | null;
  durationMinutes: number | null;
  accessEndsAt: string | null;
  isAccessOpen: boolean;
}

export interface LessonMediaDto {
  id: string;
  fileName: string;
  originalFileName: string;
  fileExtension: string;
  mediaType: string;
  cloudinaryUrl: string;
  publicId: string;
  fileSizeBytes: number;
  duration: number | null;
  displayOrder: number;
  metaData: string | null;
}

export interface LessonForClassResponse {
  lesson: LessonForClassDto;
  media: LessonMediaDto[];
  mediaCount: number;
}

export interface LessonWatchStatusStudent {
  studentId: string;
  studentName: string;
  hasWatched: boolean;
  watchedAt: string | null;
}

export interface LessonWatchStatus {
  lessonId: string;
  aim: string;
  classroomId: string;
  classroomName: string;
  totalStudents: number;
  watchedCount: number;
  watchedRate: number;
  students: LessonWatchStatusStudent[];
}

export const lessonService = {
  // ── Lesson for Class ───────────────────────────────────────────────────────
  getLessonForClass: (lessonId: string) =>
    API.get<TResponse<LessonForClassResponse>>(`api/lessons/${lessonId}/class`, {
      headers: { "X-Tenant-ID": X_Tenant_ID },
    }),

  // GET api/lessons/{lessonId}/watch-status — Administrator, SuperAdministrator,
  // HeadTeacher only. Who in the classroom has actually watched this lesson.
  getWatchStatus: (lessonId: string) =>
    API.get<TResponse<LessonWatchStatus>>(`api/lessons/${lessonId}/watch-status`, {
      headers: { "X-Tenant-ID": X_Tenant_ID },
    }),

  // ── Approval endpoints ─────────────────────────────────────────────────────
  getPendingApprovals: () =>
    API.get<TResponse<PendingApprovalsResponse>>("api/User/approvals", {
      headers: { "X-Tenant-ID": X_Tenant_ID },
    }),

  respondToApproval: (approvalId: string, payload: ApprovalRespondPayload) =>
    API.post<TResponse<{ approvalId: string; newStatus: string }>>(
      `api/User/approvals/${approvalId}/respond`,
      payload,
      { headers: { "X-Tenant-ID": X_Tenant_ID } }
    ),

  getUploadSignature: (mediaType: LessonMediaTypeValue) =>
    API.get<TResponse<CloudinarySignature>>("api/lessons/upload-signature", {
      headers: { "X-Tenant-ID": X_Tenant_ID },
      params: { mediaType },
    }),

  getSupabaseUploadToken: (fileName: string) =>
    API.get<TResponse<SupabaseUploadToken>>("api/lessons/supabase-upload-token", {
      headers: { "X-Tenant-ID": X_Tenant_ID },
      params: { fileName },
    }),

  submitLesson: (payload: SubmitLessonPayload) =>
    API.post<TResponse<SubmitLessonResponse>>("api/lessons/submit", payload, {
      headers: { "X-Tenant-ID": X_Tenant_ID, "Content-Type": "application/json" },
    }),

  // POST api/lessons/draft — backend sets IsDraft=true, BypassApproval=false
  saveDraft: (payload: DraftLessonPayload) =>
    API.post<TResponse<SubmitLessonResponse>>("api/lessons/draft", payload, {
      headers: { "X-Tenant-ID": X_Tenant_ID, "Content-Type": "application/json" },
    }),

  // GET api/lessons/my-lessons
  getMyLessons: (params?: { status?: string; pageNumber?: number; pageSize?: number }) =>
    API.get<TResponse<MyLessonsData>>("api/lessons/my-lessons", {
      params,
      headers: { "X-Tenant-ID": X_Tenant_ID },
    }),

  // GET api/School/topics/{subjectId}
  getTopicsBySubject: (subjectId: string) =>
    API.get<TResponse<LessonTopic[]>>(`api/School/topics/${subjectId}`, {
      headers: { "X-Tenant-ID": X_Tenant_ID },
    }),

  // GET api/School/subtopics/{topicId}
  getSubTopicsByTopic: (topicId: string) =>
    API.get<TResponse<LessonSubTopic[]>>(`api/School/subtopics/${topicId}`, {
      headers: { "X-Tenant-ID": X_Tenant_ID },
    }),

  // POST api/sessions/manifest — submits the full session manifest for replay
  submitManifest: (payload: SubmitManifestPayload) =>
    API.post<TResponse<SubmitManifestResponse>>("api/sessions/manifest", payload, {
      headers: { "X-Tenant-ID": X_Tenant_ID },
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC ARCHITECTURE ENDPOINTS
  // Event-based endpoints return 204 No Content for fast processing
  // ═══════════════════════════════════════════════════════════════════════════

  // POST api/sessions/strokes — uploads a batch of compressed strokes
  // Returns 204 on success (event-based processing)
  uploadStrokeBatch: (payload: StrokeBatchPayload) =>
    API.post("api/sessions/strokes", payload, {
      headers: { "X-Tenant-ID": X_Tenant_ID },
      validateStatus: (status) => status === 204 || status === 200,
    }),

  // POST api/sessions/audio-metadata — registers audio chunk metadata after Cloudinary upload
  // Returns 204 on success (event-based processing)
  registerAudioChunk: (payload: AudioChunkMetadata) =>
    API.post("api/sessions/audio-metadata", payload, {
      headers: { "X-Tenant-ID": X_Tenant_ID },
      validateStatus: (status) => status === 204 || status === 200,
    }),

  // POST api/sessions/publish — submits the final session manifest for publishing
  // This triggers backend to finalize the lesson and make it available for replay
  publishSession: (payload: SessionManifestPayload) =>
    API.post("api/sessions/publish", payload, {
      headers: { "X-Tenant-ID": X_Tenant_ID },
      validateStatus: (status) => status === 204 || status === 200,
    }),
};
