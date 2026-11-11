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
}

export interface CreateLiveClassRequest {
  lessonId: string;
  studentIds: string[]; // 1-3
  title?: string;
  /** No offset sends it as bare local time — the backend reads that as
   * school time (WAT) directly. Omit entirely for the old "start on the
   * spot" behavior; the new UI always schedules. */
  scheduledStart?: string;
  /** 5-40, defaults to 40 server-side if omitted. */
  durationMinutes?: number;
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
}

const headers = () => ({ "X-Tenant-ID": getTenantFromUrl() });

export const liveClassService = {
  // POST /api/live-class
  create: (payload: CreateLiveClassRequest) =>
    API.post<TResponse<LiveClassDto>>("api/live-class", payload, {
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
