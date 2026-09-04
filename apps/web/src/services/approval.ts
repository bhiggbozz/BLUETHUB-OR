import { token } from "@/utils";

import { API, type TResponse } from ".";

// import { X_Tenant_ID } from "@/utils/tenant";
import { getTenantFromUrl } from "@/utils/subdomain";

export interface ApprovalPayload {
  Title?: string;
  SubjectName?: string;
  ClassName?: string;
  Description?: string;
  Term?: string | null;
  ExamDate?: string | null;
  TotalMarks?: number | null;
  UserRole?: string | null;
  UserName?: string | null;
  EntityIds?: string[];
  // CreateGroup — the group operation types don't populate `summary`
  // consistently, so the group's own name/classroom live here instead.
  GroupName?: string;
  ClassroomId?: string;
}

// Generic non-lesson approval types (CreateGroup, SubmitGroupContent, ...)
// are meant to carry their display fields here instead of `payload` — in
// practice CreateGroup currently comes back with summary: null and puts
// GroupName/ClassroomId under payload instead, so callers should fall back
// to payload for those.
export interface ApprovalSummary {
  title?: string;
  subjectName?: string;
  className?: string;
  description?: string;
}

export interface Approval {
  id: string;
  operationType: string;
  entityType: string;
  entityId: string | null;
  status: string;
  createdAt: string;
  expiresAt: string;
  requestedByName: string;
  requestedByEmail: string;
  payload: ApprovalPayload | string | null;
  summary?: ApprovalSummary | null;
  // Seen (as null) alongside CreateGroup in a real response — shape unconfirmed,
  // populated for operation types we haven't built UI for yet (e.g. syllabus/
  // examination approvals). Left untyped on purpose so getApprovalDisplay's
  // default case can still be extended once a real example shows up.
  lesson?: unknown;
  lessonPayload?: unknown;
  syllabus?: unknown;
  examination?: unknown;
  rejectionReason?: string;
  respondedAt?: string;
}

export interface ApprovalsData {
  count: number;
  items: Approval[];
}

export function getApprovalPayload(raw: ApprovalPayload | string | null | undefined): Record<string, any> {
  let parsed: Record<string, any> = {};
  if (!raw) return parsed;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { return {}; }
  } else {
    parsed = raw as Record<string, any>;
  }
  const normalized: Record<string, any> = { ...parsed };
  for (const key of Object.keys(parsed)) {
    const camel = key.charAt(0).toLowerCase() + key.slice(1);
    if (camel !== key && !(camel in normalized)) normalized[camel] = parsed[key];
  }
  return normalized;
}

export interface ApprovalDisplay {
  title: string;
  subjectName?: string;
  className?: string;
}

// Each operation type keeps its display fields in a different place on the
// response — this is the one place that decides which, keyed off
// operationType instead of guessing from whichever fields happen to be
// present. Only two non-default shapes are confirmed: "CreateGroup" (seen
// live — title lives in payload.GroupName, summary is null) and
// "SubmitGroupContent" (per the given spec's summary object, not seen live
// yet). We don't know the real operationType string lessons are submitted
// under, so everything else — including lessons — shares one default that
// preserves the original payload.Title/SubjectName/ClassName lookup that
// already worked in production. That means a genuinely new type (e.g. a
// future syllabus/examination approval — note the null `syllabus`/
// `examination` fields already showing up on CreateGroup responses) will
// silently fall through this default rather than being flagged, since there's
// no safe way to tell "unrecognized type" apart from "lesson" by name alone.
export function getApprovalDisplay(approval: Approval): ApprovalDisplay {
  const payload = getApprovalPayload(approval.payload);

  switch (approval.operationType) {
    case "CreateGroup":
      return {
        title: approval.summary?.title || payload.GroupName || payload.groupName || "Study group",
      };
    case "SubmitGroupContent":
      return {
        title: approval.summary?.title || payload.aim || payload.Title || "Group content",
        subjectName: approval.summary?.subjectName,
        className: approval.summary?.className,
      };
    default:
      return {
        title: approval.summary?.title || payload.Title || payload.title || approval.entityType,
        subjectName: approval.summary?.subjectName ?? payload.SubjectName ?? payload.subjectName,
        className: approval.summary?.className ?? payload.ClassName ?? payload.className,
      };
  }
}

const headers = () => ({
  "X-Tenant-ID": getTenantFromUrl(),
  Authorization: `Bearer ${token.getToken()}`,
});

export const approvalService = {
  getPendingApprovals: () =>
    API.get<TResponse<ApprovalsData>>("/api/User/approvals", { headers: headers() }),

  respondToApproval: (id: string, payload: { approved: boolean; rejectionReason?: string }) =>
    API.post<TResponse<unknown>>(`/api/User/approvals/${id}/respond`, payload, {
      headers: headers(),
    }),
};
