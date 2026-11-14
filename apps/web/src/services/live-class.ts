import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";

export type LiveClassStatus = "Scheduled" | "Live" | "Ended" | "Cancelled";

/** TeacherEnded/TimeUp: the class actually ran. Cancelled: the teacher
 * cancelled it before it started. Expired: the scheduled slot passed with
 * nobody starting it (a "missed" class, not an error). */
export type LiveClassEndReason = "TeacherEnded" | "TimeUp" | "Cancelled" | "Expired";

export type LessonApprovalStatus = "PendingApproval" | "Approved" | "Rejected" | "Published";

export interface LiveClassStudent {
  studentId: string;
  name: string;
  firstJoinedAt: string | null;
  canSpeak: boolean;
}

/** A lesson media file as returned alongside the live class itself (join
 * response, `getById`, `getMine`) — the student-safe path. Distinct from
 * `LessonMediaDto` (`services/lesson.ts`), which only comes back from the
 * teacher-only `GET api/lessons/{id}/class` endpoint; students must never
 * call that one (403 by design), so this is the shape they actually get. */
export interface LiveClassMedia {
  id: string;
  name: string;
  mediaType: string;
  fileExtension: string;
  url: string;
  sizeBytes: number;
  duration: number | null;
  displayOrder: number;
  metaData: string | null;
}

export interface LiveClassDto {
  id: string;
  lessonId: string;
  title: string | null;
  classroomId: string;
  classroomName: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  status: LiveClassStatus;
  durationMinutes: number;
  maxStudents: number;
  boardSessionId: string | null;
  createdAt: string;
  startedAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  endReason: LiveClassEndReason | null;
  /** When the class is meant to start (ISO, UTC "Z") — `null` means it was
   * started on the spot (old instant-start behavior), not scheduled. */
  scheduledStart: string | null;
  /** `scheduledStart + durationMinutes` — the slot's end, before the class
   * has actually started (`endsAt` takes over once it's Live). */
  scheduledEnd: string | null;
  /** The underlying lesson's own approval state — students only see this
   * class once it's "Approved" or later, even if the teacher scheduled it
   * while still "PendingApproval". */
  lessonStatus: LessonApprovalStatus;
  /** The teacher's Start button should be enabled only when this is true —
   * meaningless/ignored for students. */
  canStartNow: boolean;
  /** Server clock at response time (ISO) — every countdown must derive its
   * offset from this, never the device clock. */
  serverTime: string;
  students: LiveClassStudent[];
  /** `null`, not `[]`, when nothing's attached — always guard with `?? []`. */
  media: LiveClassMedia[] | null;
  /** The practice quiz attached at scheduling, if any. */
  quizCode?: string | null;
}

/** Media file shape for `schedule()` — a sibling of `MediaFilePayload`
 * (`services/lesson.ts`), not a reuse of it: this endpoint's documented
 * contract has no `mediaType` field and adds `metaData`. */
export interface ScheduleMediaFilePayload {
  fileName: string;
  originalFileName: string;
  fileExtension: string;
  cloudinaryUrl: string;
  publicId: string;
  fileSizeBytes: number;
  duration?: number | null;
  displayOrder: number;
  metaData?: string;
}

export interface ScheduleLiveClassRequest {
  classroomId: string;
  subjectId: string;
  topicId: string;
  subTopicId: string;
  aim: string;
  description: string;
  /** Defaults to the aim server-side if omitted. */
  title?: string;
  studentIds: string[]; // 1-3 active students of that classroom
  /** Must carry its own offset (or "Z") — sent bare with no offset, this is
   * read as school time (WAT), unlike the local `datetime-local` value the
   * form collects, so callers must attach the browser's own offset before
   * sending. Must be in the future, up to 90 days ahead. */
  scheduledStart: string;
  /** 5-40, defaults to 40 server-side if omitted. */
  durationMinutes?: number;
  mediaFiles?: ScheduleMediaFilePayload[];
  /** A quiz code from `quizService.createQuiz()`. A teacher can only use one
   * they created themselves; a head teacher can use any in the school. */
  quizCode?: string | null;
}

export interface RescheduleLiveClassRequest {
  scheduledStart: string;
  /** Omit to keep the current length. */
  durationMinutes?: number;
}

export interface LiveClassJoinAudio {
  url: string;
  token: string;
  roomName: string;
}

export interface LiveClassJoinBoard {
  hubPath: string;
  group: string;
}

export interface LiveClassJoinResponse {
  liveClassId: string;
  role: "Teacher" | "Student";
  displayName: string;
  title: string | null;
  lessonId: string;
  boardSessionId: string;
  audio: LiveClassJoinAudio;
  board: LiveClassJoinBoard;
  endsAt: string;
  secondsRemaining: number;
  serverTime: string;
  canSpeak: boolean;
  /** `null`, not `[]`, when nothing's attached — always guard with `?? []`. */
  media: LiveClassMedia[] | null;
  quizCode?: string | null;
}

const headers = () => ({ "X-Tenant-ID": getTenantFromUrl() });

export const liveClassService = {
  // POST /api/live-class/schedule — creates the underlying lesson and
  // schedules the live class in one call (no pre-existing lessonId needed).
  schedule: (payload: ScheduleLiveClassRequest) =>
    API.post<TResponse<LiveClassDto>>("api/live-class/schedule", payload, {
      headers: headers(),
    }),

  // POST /api/live-class/{id}/start
  start: (id: string) =>
    API.post<TResponse<LiveClassDto>>(`api/live-class/${id}/start`, {}, {
      headers: headers(),
    }),

  // PUT /api/live-class/{id}/schedule — only while still Scheduled.
  reschedule: (id: string, payload: RescheduleLiveClassRequest) =>
    API.put<TResponse<LiveClassDto>>(`api/live-class/${id}/schedule`, payload, {
      headers: headers(),
    }),

  // POST /api/live-class/{id}/join
  join: (id: string) =>
    API.post<TResponse<LiveClassJoinResponse>>(`api/live-class/${id}/join`, {}, {
      headers: headers(),
    }),

  // POST /api/live-class/{id}/end
  end: (id: string) =>
    API.post<TResponse<LiveClassDto>>(`api/live-class/${id}/end`, {}, {
      headers: headers(),
    }),

  // DELETE /api/live-class/{id} — cancel, only before start
  cancel: (id: string) =>
    API.delete<TResponse<LiveClassDto>>(`api/live-class/${id}`, {
      headers: headers(),
    }),

  // POST /api/live-class/{id}/students/{studentId}/speak
  setSpeak: (id: string, studentId: string, allow: boolean) =>
    API.post<TResponse<{ studentId: string; canSpeak: boolean; appliedNow: boolean }>>(
      `api/live-class/${id}/students/${studentId}/speak`,
      { allow },
      { headers: headers() }
    ),

  // GET /api/live-class/mine
  getMine: () =>
    API.get<TResponse<LiveClassDto[]>>("api/live-class/mine", {
      headers: headers(),
    }),

  // GET /api/live-class/{id}
  getById: (id: string) =>
    API.get<TResponse<LiveClassDto>>(`api/live-class/${id}`, {
      headers: headers(),
    }),
};
