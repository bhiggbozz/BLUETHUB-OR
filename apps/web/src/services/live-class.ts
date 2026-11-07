import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";

export type LiveClassStatus = "Scheduled" | "Live" | "Ended" | "Cancelled";

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
  endReason: string | null;
  students: LiveClassStudent[];
}

export interface CreateLiveClassRequest {
  lessonId: string;
  studentIds: string[]; // 1-3
  title?: string;
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
