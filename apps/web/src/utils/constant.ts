export const deciveType = {
  DESKTOP: "Desktop",
  MOBILE: "Mobile",
  TABLET: "Tablet",
} as const;

export interface Position {
  x: number;
  y: number;
}

export type MediaType = "video" | "pdf" | "image";

export interface IMedia {
  id: string;
  name: string;
  type: MediaType;
  url: string;
}

export type deciveType = (typeof deciveType)[keyof typeof deciveType];

export type DeviceType = keyof typeof deciveType;

export const SubjectType = {
  Major: 1,
  Minor: 2, // whatever your values are
} as const;

export type SubjectType = (typeof SubjectType)[keyof typeof SubjectType];

export const ClassCategory = {
  Primary: 1,
  Secondary: 2,
  Colleges: 3,
} as const;

export type ClassCategory = (typeof ClassCategory)[keyof typeof ClassCategory];

export interface course {
  category: SubjectType;
  subject: string;
  isActive: boolean;
  classCategory: ClassCategory;
}

export const schoolType = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Admin",
  HEADTEACHER: "Head Teacher",
  SUBJECT_TEACHER: "Subject Teacher",
  STUDENT: "Student",
} as const;




export type schoolType = (typeof schoolType)[keyof typeof schoolType];

export const schoolStatus = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  DELETED: "Deleted",
} as const;
export type schoolStatus = (typeof schoolStatus)[keyof typeof schoolStatus];

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

export const ResponseMessage = {
  SUCCESS: "Success",
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",
  BAD_REQUEST: "Bad request",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  NOT_FOUND: "Resource not found",
  CONFLICT: "Conflict occurred",
  UNPROCESSABLE_ENTITY: "Unprocessable entity",
  SERVER_ERROR: "Internal server error",
  SERVICE_UNAVAILABLE: "Service unavailable",
} as const;
export type ResponseMessage =
  (typeof ResponseMessage)[keyof typeof ResponseMessage];

/* ================= TYPES ================= */
export type ImageObject = {
  id: string;
  name: string;
  url: string;
  type?: "image" | "mp3";
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type LoadedImage = ImageObject & {
  imageElement: HTMLImageElement;
};

export const imageData: ImageObject[] = [
  {
    id: "urijfurjue",
    name: "My Image",
    url: "https://images.pexels.com/photos/736230/pexels-photo-736230.jpeg?cs=srgb&dl=pexels-jonaskakaroto-736230.jpg&fm=jpg",
    type: "image",
    x: 95,
    y: 44,
    width: 300,
    height: 400,
  },
];

export interface MediaInstance {
  id: string;
  assetId: string;
  showTime: string;
  hideTime: string;

  initialState: {
    position: { x: number; y: number };
    size: { width: number; height: number };
    rotation: number;
    zIndex: number;
  };

  stateChanges: Array<{
    timestamp: string;
    type: "move" | "resize" | "rotate";
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    rotation?: number;
  }>;

  overlayStrokes: Array<{
    id: string;
    points: number[];
    color: string;
    width: number;
    startTime: string;
    endTime: string;
    duration: number;
  }>;
}

export interface TrackedImage extends LoadedImage {
  scaleX: number;
  scaleY: number;
  rotation: number;
  mediaInstance: MediaInstance;
  transformStartTime: number | null;
  transformStartScale: { x: number; y: number } | null;
  transformStartRotation: number | null;
  dragStartTime: number | null;
  dragStartPosition: { x: number; y: number } | null;
}

export interface ReplayEvent {
  type: "show" | "hide" | "move" | "resize" | "rotate" | "stroke";
  timestamp: string;
  imageId: string;
  data: any;
  absoluteTime: number;
}

export type Stroke = {
  id: string;
  points: number[];
  color: string;
  width: number;
  type: string;
  currentBoard?: number;
  timestamp?: number;
  duration?: number;
  startTime: string;
  endTime: string;
};

export interface IBatch {
  id: string;
  startTime: string;
  endTime: string;
  hasAudio: boolean;
  hasBoard: boolean;
  mediaAction?: IActiveMedia[];
}

export interface IActions {
  totalDuration: number;
  totalBatches: number;
  batches: IBatch[];
  boardSwitchTimeline?: Array<{ timestampMs: number; toBoard: number }>;
  /** Dimensions of the teacher's board at recording time. Used by the replay
   *  player to scale strokes proportionally onto any display size. */
  recordedBoardDimensions?: { width: number; height: number };
}

export const MEDIA_STORAGE_KEY = "MEDIA_INSTANCES";

export const DB_NAME = "BluethubClassroom";
export const DB_VERSION = 12;
export const STORE_CLASS = "CLASS";
export const STORE_AUDIO = "Audio";
export const STORE_SESSIONS = "Sessions";
export const STORE_AUDIO_CHUNKS = "AudioChunks";
export const STORE_STROKE_BATCHES = "StrokeBatches";
export const STORE_REPLAY_CACHE = "ReplayCache";
export const STORE_STUDENT_BOARDS = "StudentAssessmentBoards";
export const STORE_ATTENDANCE = "AttendanceScans";
export const STORE_ATTENDANCE_SESSIONS = "AttendanceSessions";
export const STORE_OFFLINE_LEARNERS = "offlineLearners"

// ── Sync Status Types ─────────────────────────────────────────────────────────

export type SyncStatus = "pending" | "uploading" | "sent" | "failed";

export type SessionStatus = "recording" | "paused" | "completed" | "draft" | "publishing" | "published" | "failed";

// ── Attendance (offline-first QR attendance) ───────────────────────────────────
// attendanceType is an int per the backend contract: 0 = Class, 1 = Subject, 2 = SubTopic.

export const AttendanceType = {
  CLASS: 0,
  SUBJECT: 1,
  SUBTOPIC: 2,
} as const;

export type AttendanceType = (typeof AttendanceType)[keyof typeof AttendanceType];

export type AttendanceSessionStatus = "open" | "ended";

/** A locally-tracked attendance session. Maps 1:1 to a backend session opened
 *  via POST /api/Attendance/session/start once the network is available. */
export interface LocalAttendanceSession {
  id: string;
  attendanceType: AttendanceType;
  /** Teacher who captured this session (audit). */
  teacherId?: string;
  teacherName?: string;
  classroomId?: string;
  classroomName?: string;
  subjectId?: string;
  subjectName?: string;
  subTopicId?: string;
  subTopicName?: string;
  /** Local YYYY-MM-DD the session belongs to (dedupe scope). */
  dateKey: string;
  /** Unique context key: `${attendanceType}|${classroomId}|${subjectId}|${subTopicId}` */
  scopeKey: string;
  /** Backend session id returned by session/start. null until first successful sync. */
  backendSessionId: string | null;
  status: AttendanceSessionStatus;
  startedAt: string;
  endedAt?: string;
  /** Whether POST /session/end was successfully pushed for this session. */
  endSyncRequested: boolean;
  createdAt: string;
}

/** A single scanned student (one record per QR scan). Persisted immediately so
 *  nothing is lost offline; pushed to the backend when the network allows. */
export interface AttendanceScanRecord {
  id: string;
  /** FK to the local attendance session id. */
  sessionId: string;
  backendSessionId: string | null;
  /** The value encoded in the student's QR (what the scan endpoint expects). */
  qrToken: string;
  studentName?: string;
  /** Teacher who captured this scan (audit). */
  teacherId?: string;
  teacherName?: string;
  scannedAt: string;
  dateKey: string;
  scopeKey: string;
  /** `${dateKey}|${scopeKey}|${qrToken}` — used to guarantee a student is only
   *  marked once per class/date or subtopic/day (the "same record" rule). */
  dedupeKey: string;
  syncStatus: SyncStatus;
  /** Permanent failures (4xx validation) are never auto-retried. */
  permanentlyFailed: boolean;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: string;
}

export type CompressedStroke = {
  id: string;
  sessionId: string | null;
  data: string;
  color: string;
  width: number;
  type: string;
  currentBoard: number;
  timestamp: number;
  duration: number;
  startTime: string;
  endTime: string;
};

export type AudioBatch = {
  id: string;
  type: "audio";
  sessionId: string;
  batchId: number;
  timestamp: number;
  blob: Blob;
  duration: number;
  size: number;
};

// ═══════════════════════════════════════════════════════════════════════════════
// NEW SYNC ARCHITECTURE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Local Session Record ──────────────────────────────────────────────────────

export interface LocalSession {
  id: string;
  lessonId: string;
  schoolId: string;

  status: SessionStatus;
  uploadRequested?: boolean;

  teacher: {
    id: string;
    name: string;
    email: string;
  };

  lesson: {
    topic: string;
    subTopic: string;
    aim: string;
    subjectId: string;
    subjectName: string;
    classroomId: string;
    className: string;
  };

  recording: {
    startedAt: string;
    endedAt: string | null;
    totalDurationMs: number;
    pausedDurationMs: number;
    deviceType: string;
    screenWidth: number;
    screenHeight: number;
  };

  totalAudioChunks: number;
  totalStrokeBatches: number;

  syncProgress: {
    audioSent: number;
    audioFailed: number;
    strokesSent: number;
    strokesFailed: number;
    manifestSent: boolean;
  };

  adjustments: {
    trimStartMs: number;
    trimEndMs: number;
    deletedSections: Array<{ startMs: number; endMs: number }>;
    chapters: Array<{ timestampMs: number; label: string }>;
  };

  mediaEvents: IActiveMedia[];
  boardEvents: Array<{
    id: string;
    type: "switch";
    timestampMs: number;
    fromBoard: number;
    toBoard: number;
  }>;

  createdAt: string;
  modifiedAt: string;
}

// ── Audio Chunk with Sync Status ──────────────────────────────────────────────

export interface LocalAudioChunk {
  id: string;
  sessionId: string;
  lessonId: string;

  chunkIndex: number;        // Local 10s chunk index (0, 1, 2, 3, 4, 5, 6, ...)
  uploadBatchIndex: number;  // 60s upload batch index (0, 0, 0, 0, 0, 0, 1, ...)

  startMs: number;
  endMs: number;
  durationMs: number;

  blob: Blob;
  mimeType: string;
  sizeBytes: number;

  syncStatus: SyncStatus;
  cloudinaryUrl: string | null;
  cloudinaryPublicId: string | null;

  uploadAttempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;

  isDeleted: boolean;

  createdAt: string;
  sentAt: string | null;
}

// ── Stroke Batch with Sync Status ─────────────────────────────────────────────

export interface LocalStrokeBatch {
  id: string;
  sessionId: string;
  lessonId: string;

  batchIndex: number;

  startMs: number;
  endMs: number;

  strokes: CompressedStroke[];
  strokeCount: number;
  sizeBytes: number;

  boardSwitches?: Array<{ fromBoard: number; toBoard: number; timestampMs: number }>;

  syncStatus: SyncStatus;

  uploadAttempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;

  createdAt: string;
  sentAt: string | null;

  // Backend stroke batch identifier: sessionId_batchIndex
  indexKey?: string;
}

// ── Replay Download Cache ─────────────────────────────────────────────────────
// Tracks which items have been downloaded for a given session so that
// interrupted downloads can be resumed and corrupted audio can be re-fetched.

export interface ReplayDownloadCache {
  id: string;                   // primary key = sessionId
  sessionId: string;
  version: string;              // bump this string to invalidate the cache
  // NOTE: manifestJson was removed — it was blob-backed by Chrome IDB when
  // large (>64 KB), causing "Failed to write blobs" on every download attempt.
  // The manifest is now always fetched fresh from the API (lightweight call).
  downloadedBatches: string[];  // batchRef.indexKey values already in IDB
  downloadedAudioChunks: number[]; // chunk.index values whose audio blob is valid
  createdAt: number;            // Date.now()
  updatedAt: number;
}

export interface SessionManifest {
  version: string;

  session: {
    id: string;
    lessonId: string;
    schoolId: string;
    recordedAt: string;
    publishedAt: string;
    teacher: { id: string; name: string };
  };

  lesson: {
    topic: string;
    subTopic: string;
    aim: string;
    subject: { id: string; name: string };
    classroom: { id: string; name: string };
  };

  stats: {
    totalDurationMs: number;
    totalDurationFormatted: string;
    chunkCount: number;
    chunkDurationMs: number;
    totalAudioSizeBytes: number;
    totalStrokeCount: number;
    boardCount: number;
  };

  chunks: Array<{
    index: number;
    startMs: number;
    endMs: number;
    audio: {
      url: string;
      sizeBytes: number;
      durationMs: number;
    };
    strokes: {
      count: number;
      sizeBytes: number;
    } | null;
    events: Array<{
      type: string;
      timestampMs: number;
      [key: string]: unknown;
    }>;
  }>;

  mediaAssets: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;

  boards: Array<{
    index: number;
    dimensions: { width: number; height: number };
    strokeCount: number;
  }>;

  chapters: Array<{
    timestampMs: number;
    label: string;
  }>;
}

// ── Cloudinary Config ─────────────────────────────────────────────────────────

export interface CloudinaryUploadConfig {
  resourceType: string;
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  uploadPreset?: string | null;
}

export interface IPdfPageEvent {
  page: number;
  timerDisplay: string;
  elapsedMs?: number;
}

export interface IPdfScrollEvent {
  scrollRatio: number;
  timerDisplay: string;
  elapsedMs?: number;
}

export interface IMediaPlaybackEvent {
  state: 'play' | 'pause';
  timerDisplay: string;
  elapsedMs?: number;
}

export interface IActiveMedia extends IMedia {
  show: string | null;
  closed: string | null;
  showMs?: number;
  closedMs?: number;
  pause?: string;
  play?: string;
  frameIndex?: 0 | 1;
  pdfPages?: IPdfPageEvent[];
  pdfScrollEvents?: IPdfScrollEvent[];
  playbackEvents?: IMediaPlaybackEvent[];
}
