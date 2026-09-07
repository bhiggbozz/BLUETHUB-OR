/**
 * Board Session Service
 *
 * Handles board session batch and manifest submission to the backend.
 * Uses the /api/board endpoints for live class recording.
 *
 * Endpoints:
 * - POST /api/board/session/{sessionId}/batch - Submit board batch during class
 * - POST /api/board/session/{sessionId}/manifest - Submit manifest when class ends
 * - GET /api/board/session/{sessionId} - Get session (for debugging)
 */

import { getTenantFromUrl } from '@/utils/subdomain';
import { API } from './index';
// import { X_Tenant_ID } from "@/utils/tenant";
import type { CompressedStroke } from '@/utils/constant';

const X_Tenant_ID = getTenantFromUrl()

// ── Types matching backend ViewModels ────────────────────────────────────────

export interface BoardBatchPayload {
  sessionId: string;
  lessonId: string;
  batchIndex: number;
  startMs: number;
  endMs: number;
  strokes: CompressedStroke[];
  strokeCount: number;
  boardIndex: number;
  audioChunkUrls?: string[];
}

// Body for POST /api/board/group-content/group/{groupId}/batch — the student
// study-group content pipeline. No sessionId: the batch is keyed by groupId
// (route + body) + the caller's student ID from the JWT + batchIndex, and is
// published to its own queue/worker/Mongo collection so it never contends
// with the teacher's live-session pipeline above.
export interface GroupContentBoardBatchPayload {
  groupId: string;
  batchIndex: number;
  startMs: number;
  endMs: number;
  strokeCount: number;
  sizeBytes: number;
  boardIndex: number;
  strokes: CompressedStroke[];
  boardSwitches?: Array<{ fromBoard: number; toBoard: number; timestampMs: number }>;
  audioUrl?: string | null;
}

export interface SessionManifestPayload {
  version: string;
  session: {
    id: string;
    lessonId: string;
    schoolId: string;
    recordedAt: string;
    publishedAt: string;
    teacher: {
      id: string;
      name: string;
    };
  };
  lesson: {
    topic: string;
    subTopic: string;
    aim: string;
    subject: {
      id: string;
      name: string;
    };
    classroom: {
      id: string;
      name: string;
    };
  };
  stats: {
    totalDurationMs: number;
    totalDurationFormatted: string;
    chunkCount: number;
    chunkDurationMs: number;          // Upload batch size (60s)
    seekGranularityMs: number;        // Seeking granularity (10s) for player skip controls
    totalAudioSizeBytes: number;
    totalStrokeCount: number;
    boardCount: number;
    strokeBatchCount: number;
  };
  // Audio chunks (uploaded to Cloudinary)
  chunks: Array<{
    index: number;
    startMs: number;
    endMs: number;
    audio: {
      url: string;
      mediaId: string;
      sizeBytes: number;
      durationMs: number;
    };
    events: unknown[];
  }>;
  // Stroke batches are stored separately in MongoDB via submitBatch endpoint
  // The manifest references them by explicit id and index key
  strokeBatches: Array<{
    id?: string;       // sessionId_batchIndex
    batchIndex: number;
    indexKey: string; // sessionId_batchIndex
    startMs: number;
    endMs: number;
    strokeCount: number;
    sizeBytes: number;
    boardIndex?: number;
    audioUrl?: string | null;
    boardSwitches?: Array<{ fromBoard: number; toBoard: number; timestampMs: number }>;
  }>;
  mediaAssets: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  boards: Array<{
    index: number;
    dimensions: {
      width: number;
      height: number;
    };
    strokeCount: number;
  }>;
  chapters: Array<{
    title: string;
    startMs: number;
    endMs: number;
  }>;
  boardSwitches?: Array<{
    fromBoard: number;
    toBoard: number;
    timestampMs: number;
  }>;
}

// Body for POST /api/board/group-content/group/{groupId}/manifest — same shape
// as SessionManifestPayload minus session/lesson/mediaAssets/chapters, since
// that metadata lives on GroupLessonContent (set via SubmitContent) rather
// than on the board recording itself. Plain upsert on the backend — it does
// not recompute stats from stored batches, so the client is the source of truth.
export interface GroupContentManifestPayload {
  groupId: string;
  stats: {
    totalDurationMs: number;
    totalDurationFormatted: string;
    chunkCount: number;
    chunkDurationMs: number;
    seekGranularityMs: number;
    totalAudioSizeBytes: number;
    totalStrokeCount: number;
    boardCount: number;
    strokeBatchCount: number;
  };
  strokeBatches: Array<{
    batchIndex: number;
    indexKey: string;
    startMs: number;
    endMs: number;
    strokeCount: number;
    sizeBytes: number;
  }>;
  boards: Array<{
    index: number;
    dimensions: { width: number; height: number };
    strokeCount: number;
  }>;
  boardSwitches?: Array<{
    fromBoard: number;
    toBoard: number;
    timestampMs: number;
  }>;
  audioFinalUrl?: string | null;
}

// Response for GET /api/board/group-content/group/{groupId}/status — tells the
// frontend whether it's safe to start a new recording, should resume one in
// progress, or must block re-recording because a GroupLessonContent already
// exists for this group+student's recording slot.
export type GroupContentStatusKind =
  | "NoActiveContent"
  | "RecordingInProgress"
  | "AwaitingSubmission"
  | "PendingApproval"
  | "Approved"
  | "Rejected";

export interface GroupContentStatusData {
  status: GroupContentStatusKind;
  hasBoardRecording?: boolean;
  hasManifest?: boolean;
  lastBatchIndex?: number;
  contentId?: string;
  rejectionReason?: string | null;
}

export interface BoardSessionResponse {
  responseCode: string;
  responseMessage: string;
  status: string;
  data?: unknown;
}

// ── Service ──────────────────────────────────────────────────────────────────

// Response type for fetched stroke batches
export interface FetchedStrokeBatch {
  batchIndex: number;
  startMs: number;
  endMs: number;
  strokes: CompressedStroke[];
  strokeCount: number;
  boardIndex: number;
}

export const boardSessionService = {
  /**
   * Submit a board batch during live class
   * Publishes to RabbitMQ queue and returns immediately (204 No Content)
   */
  submitBatch: async (sessionId: string, payload: BoardBatchPayload): Promise<void> => {
    await API.post(`api/board/session/${sessionId}/batch`, payload, {
      headers: { 'X-Tenant-ID': X_Tenant_ID },
      validateStatus: (status) => status === 204 || status === 200,
    });
  },

  /**
   * Submit a stroke batch for student study-group content.
   * Same 1-minute batching model as submitBatch, but routed to its own
   * queue/worker/collection — never touches the teacher's live pipeline.
   */
  submitGroupContentBatch: async (groupId: string, payload: GroupContentBoardBatchPayload): Promise<void> => {
    await API.post(`api/board/group-content/group/${groupId}/batch`, payload, {
      headers: { 'X-Tenant-ID': X_Tenant_ID },
      validateStatus: (status) => status === 204 || status === 200,
    });
  },

  /**
   * Submit session manifest when class ends
   * Called once to finalize the recording session
   */
  submitManifest: async (
    sessionId: string,
    manifest: SessionManifestPayload
  ): Promise<BoardSessionResponse> => {
    const response = await API.post<BoardSessionResponse>(
      `api/board/session/${sessionId}/manifest`,
      manifest,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data;
  },

  /**
   * Submit the finalized manifest for student study-group content.
   * Saved to its own group_content_manifests collection (_id = groupId_studentId),
   * separate from the teacher's session manifests.
   */
  submitGroupContentManifest: async (
    groupId: string,
    manifest: GroupContentManifestPayload
  ): Promise<BoardSessionResponse> => {
    const response = await API.post<BoardSessionResponse>(
      `api/board/group-content/group/${groupId}/manifest`,
      manifest,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data;
  },

  /**
   * Get a student's group-content recording manifest, for playback review
   * (e.g. a teacher watching a submission before approving it). Same
   * permission model as the batch fetch below: the recording's own student,
   * the classroom's resolved approver, or any group member once Approved.
   */
  getGroupContentManifest: async (
    groupId: string,
    studentId: string
  ): Promise<GroupContentManifestPayload | null> => {
    const response = await API.get<{ data: GroupContentManifestPayload }>(
      `api/board/group-content/group/${groupId}/student/${studentId}/manifest`,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data.data ?? null;
  },

  /**
   * Get a single stroke batch from a student's group-content recording, by
   * batchIndex (as referenced in that student's manifest.strokeBatches).
   */
  getGroupContentBatch: async (
    groupId: string,
    studentId: string,
    batchIndex: number
  ): Promise<FetchedStrokeBatch | null> => {
    const response = await API.get<{ data: FetchedStrokeBatch }>(
      `api/board/group-content/group/${groupId}/student/${studentId}/batch/${batchIndex}`,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data.data ?? null;
  },

  /**
   * Check the current group-content recording state for this student in this
   * group, before starting/resuming a board recording.
   */
  getGroupContentStatus: async (groupId: string): Promise<GroupContentStatusData> => {
    const response = await API.get<{ data: GroupContentStatusData }>(
      `api/board/group-content/group/${groupId}/status`,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data.data;
  },

  /**
   * Get session details (for debugging/admin)
   */
  getSession: async (sessionId: string): Promise<BoardSessionResponse> => {
    const response = await API.get<BoardSessionResponse>(
      `api/board/session/${sessionId}`,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYBACK ENDPOINTS - For fetching recorded session data
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all stroke batches for a session (for replay)
   * Returns batches sorted by batchIndex
   */
  getBatches: async (sessionId: string): Promise<FetchedStrokeBatch[]> => {
    const response = await API.get<{ data: FetchedStrokeBatch[] }>(
      `api/board/session/${sessionId}/batches`,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data.data ?? [];
  },

  /**
   * Get a single stroke batch by index key (sessionId_batchIndex)
   * Used for on-demand loading during playback
   * Endpoint: GET /api/board/session/{sessionId}/batch/{indexKey}
   */
  getBatchByIndexKey: async (sessionId: string, indexKey: string): Promise<FetchedStrokeBatch | null> => {
    const response = await API.get<{ data: FetchedStrokeBatch }>(
      `api/board/session/${sessionId}/batch/${indexKey}`,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data.data ?? null;
  },

  /**
   * Get session manifest for replay — teacher / admin
   * Contains audio URLs, stroke batch references, and metadata
   */
  getManifest: async (sessionId: string): Promise<SessionManifestPayload | null> => {
    const response = await API.get<{ data: SessionManifestPayload }>(
      `api/board/session/${sessionId}/manifest`,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data.data ?? null;
  },

  /**
   * Get session manifest for replay — student
   * Endpoint: GET /api/board/session/{sessionId}/manifest
   */
  getStudentManifest: async (sessionId: string): Promise<SessionManifestPayload | null> => {
    const response = await API.get<{ data: SessionManifestPayload }>(
      `/api/board/session/${sessionId}/manifest`,
      { headers: { 'X-Tenant-ID': X_Tenant_ID } }
    );
    return response.data.data ?? null;
  },
};

export default boardSessionService;
