import { API, type TResponse } from ".";
import { getTenantFromUrl } from "@/utils/subdomain";

const headers = { "X-Tenant-ID": getTenantFromUrl() };

// ── Backend contract (every call needs Bearer + X-Tenant-ID) ──────────────────
//   GET    /api/Calendar/templates
//   GET    /api/Calendar/sessions
//   GET    /api/Calendar/sessions/current
//   GET    /api/Calendar/sessions/{id}
//   POST   /api/Calendar/sessions
//   PUT    /api/Calendar/sessions/{id}
//   DELETE /api/Calendar/sessions/{id}
//   POST   /api/Calendar/sessions/{id}/terms
//   PUT    /api/Calendar/terms/{id}
//   DELETE /api/Calendar/terms/{id}
//   GET    /api/Calendar/entry-types
//   GET    /api/Calendar/entries?from&to&classroomId&subjectId&studentId
//   GET    /api/Calendar/entries/{id}
//   POST   /api/Calendar/entries
//   PUT    /api/Calendar/entries/{id}
//   DELETE /api/Calendar/entries/{id}
// View-only for everyone; session/term writes need SuperAdministrator, or
// Administrator with the ManageCalendar (256) permission — see
// services/admin-permissions.ts. Entries are scoped by role (see
// pages/calendar/hooks/use-entry-write-access.ts); the server enforces
// `canEdit` on each entry regardless of what the UI shows.
//
// NOTE: these endpoints ship in the backend's next deploy. If they 404 in
// your environment, that's expected — the contract itself does not change.
// ───────────────────────────────────────────────────────────────────────────────

export type CalendarTemplateKey = "ThreeTerm" | "British" | "TwoSemester" | "Custom";

export interface CalendarTemplateDto {
  key: CalendarTemplateKey;
  label: string;
  termNames: string[];
}

export type CalendarSessionStatus = "Upcoming" | "Current" | "Past";

export interface CalendarTermDto {
  id: string;
  name: string;
  sequence: number;
  /** yyyy-MM-dd, inclusive */
  startDate: string;
  /** yyyy-MM-dd, inclusive */
  endDate: string;
  status: CalendarSessionStatus;
}

export interface CalendarSessionDto {
  id: string;
  name: string;
  /** yyyy-MM-dd, inclusive */
  startDate: string;
  /** yyyy-MM-dd, inclusive */
  endDate: string;
  status: CalendarSessionStatus;
  terms: CalendarTermDto[];
}

export interface CalendarTermPayload {
  name: string;
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd */
  endDate: string;
}

export interface CreateCalendarSessionPayload {
  name: string;
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd */
  endDate: string;
  template?: CalendarTemplateKey;
  terms: CalendarTermPayload[];
}

export interface UpdateCalendarSessionPayload {
  name: string;
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd */
  endDate: string;
}

// ── Entries ──────────────────────────────────────────────────────────────────

export type CalendarEntryTypeKey = "Assessment" | "Quiz" | "MidTerm" | "Exam" | "Holiday" | "Other";

export interface CalendarEntryTypeDto {
  key: CalendarEntryTypeKey;
  label: string;
}

export type CalendarEntryScope = "School" | "Classroom" | "Subject";

export interface CalendarEntryChange {
  changedById: string;
  changedByName: string;
  changedByRole: string;
  /** UTC ISO timestamp — format in the viewer's local time. */
  changedAt: string;
  action: string;
  previousTitle?: string | null;
  newTitle?: string | null;
  previousEntryType?: CalendarEntryTypeKey | null;
  newEntryType?: CalendarEntryTypeKey | null;
  /** yyyy-MM-dd */
  previousStartDate?: string | null;
  /** yyyy-MM-dd */
  previousEndDate?: string | null;
  /** yyyy-MM-dd */
  newStartDate?: string | null;
  /** yyyy-MM-dd */
  newEndDate?: string | null;
  /** Ready-made sentence from the server — show verbatim, don't parse it. */
  message: string;
}

export interface CalendarEntryDto {
  id: string;
  sessionId: string;
  termId: string;
  title: string;
  entryType: CalendarEntryTypeKey;
  description: string | null;
  /** yyyy-MM-dd, inclusive */
  startDate: string;
  /** yyyy-MM-dd, inclusive */
  endDate: string;
  status: CalendarSessionStatus;
  scopeType: CalendarEntryScope;
  classroomId: string | null;
  classroomName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  createdById: string;
  createdByName: string;
  createdByRole: string;
  isAdminEntry: boolean;
  /** Server-decided — only show Edit/Delete when this is true. */
  canEdit: boolean;
  /** null unless someone other than the creator changed the entry. */
  lastChange: CalendarEntryChange | null;
  /** Full history, newest first — only populated on the detail endpoint. */
  changes?: CalendarEntryChange[];
}

export interface CreateCalendarEntryPayload {
  title: string;
  entryType: CalendarEntryTypeKey;
  description?: string;
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd */
  endDate: string;
  scopeType: CalendarEntryScope;
  classroomId?: string;
  subjectId?: string;
}

export interface UpdateCalendarEntryPayload {
  title: string;
  entryType: CalendarEntryTypeKey;
  description?: string;
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd */
  endDate: string;
}

export interface GetCalendarEntriesParams {
  /** yyyy-MM-dd */
  from: string;
  /** yyyy-MM-dd */
  to: string;
  classroomId?: string;
  subjectId?: string;
  /** A parent may pass one of their own children; otherwise 403. */
  studentId?: string;
}

export const calendarService = {
  getTemplates: () =>
    API.get<TResponse<CalendarTemplateDto[]>>("/api/Calendar/templates", { headers }),

  getSessions: () =>
    API.get<TResponse<CalendarSessionDto[]>>("/api/Calendar/sessions", { headers }),

  /** data is null when the school has no calendar yet — not an error. */
  getCurrentSession: () =>
    API.get<TResponse<CalendarSessionDto | null>>("/api/Calendar/sessions/current", { headers }),

  getSession: (sessionId: string) =>
    API.get<TResponse<CalendarSessionDto>>(`/api/Calendar/sessions/${sessionId}`, { headers }),

  createSession: (payload: CreateCalendarSessionPayload) =>
    API.post<TResponse<CalendarSessionDto>>("/api/Calendar/sessions", payload, { headers }),

  updateSession: (sessionId: string, payload: UpdateCalendarSessionPayload) =>
    API.put<TResponse<CalendarSessionDto>>(`/api/Calendar/sessions/${sessionId}`, payload, { headers }),

  deleteSession: (sessionId: string) =>
    API.delete<TResponse<null>>(`/api/Calendar/sessions/${sessionId}`, { headers }),

  /** Returns the whole updated session — replace the cached one, no refetch. */
  addTerm: (sessionId: string, payload: CalendarTermPayload) =>
    API.post<TResponse<CalendarSessionDto>>(`/api/Calendar/sessions/${sessionId}/terms`, payload, { headers }),

  /** Returns the whole updated session — replace the cached one, no refetch. */
  updateTerm: (termId: string, payload: CalendarTermPayload) =>
    API.put<TResponse<CalendarSessionDto>>(`/api/Calendar/terms/${termId}`, payload, { headers }),

  /** Returns the whole updated session — replace the cached one, no refetch. */
  deleteTerm: (termId: string) =>
    API.delete<TResponse<CalendarSessionDto>>(`/api/Calendar/terms/${termId}`, { headers }),

  getEntryTypes: () =>
    API.get<TResponse<CalendarEntryTypeDto[]>>("/api/Calendar/entry-types", { headers }),

  /** Already filtered server-side to what the caller may see. */
  getEntries: (params: GetCalendarEntriesParams) =>
    API.get<TResponse<CalendarEntryDto[]>>("/api/Calendar/entries", { headers, params }),

  getEntry: (entryId: string) =>
    API.get<TResponse<CalendarEntryDto>>(`/api/Calendar/entries/${entryId}`, { headers }),

  createEntry: (payload: CreateCalendarEntryPayload) =>
    API.post<TResponse<CalendarEntryDto>>("/api/Calendar/entries", payload, { headers }),

  /** Scope cannot change after creation. Saving with no changes returns "No changes to save". */
  updateEntry: (entryId: string, payload: UpdateCalendarEntryPayload) =>
    API.put<TResponse<CalendarEntryDto>>(`/api/Calendar/entries/${entryId}`, payload, { headers }),

  deleteEntry: (entryId: string) =>
    API.delete<TResponse<null>>(`/api/Calendar/entries/${entryId}`, { headers }),
};

export default calendarService;
