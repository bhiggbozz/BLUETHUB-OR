import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  FileAudio,
  FileText,
  Loader2,
  Mail,
  PlayCircle,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApprovalDisplay } from "@/services/approval";
import { groupService, type GroupContentDetail } from "@/services/groups";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ApprovalSummary {
  title?: string;
  subjectName?: string;
  className?: string;
  description?: string;
}

export interface Approval {
  id: string;
  entityType: string;
  entityId?: string | null;
  status: "pending" | "approved" | "rejected";
  operationType: string;
  createdAt: string;
  requestedByName: string;
  requestedByEmail?: string;
  respondedAt?: string;
  respondedByName?: string;
  rejectionReason?: string;
  expiresAt?: string;
  payload: string | Record<string, unknown>;
  summary?: ApprovalSummary | null;
}

interface ApprovalPayload {
  Title?: string;
  subjectName?: string;
  className?: string;
  description?: string;
  Term?: string;
  ExamDate?: string;
  TotalMarks?: number;
  LessonObjectives?: string;
  LessonNotes?: string;
  MediaFiles?: { name: string; url: string }[];

  aim?: string;
  topicName?: string;
  subTopic?: string;
  mediaCount?: number;
  hasRecording?: boolean;

  // CreateGroup — not consistently mirrored into `summary`, so the group's
  // own name lives here instead.
  GroupName?: string;
  groupName?: string;

  // SubmitGroupContent — needed to fetch the real content detail (real media
  // URLs, board recording) instead of just the counts this payload carries.
  groupId?: string;
  GroupId?: string;
  contentId?: string;
  ContentId?: string;
}

// Media file entries come from two different producers with different field
// names: the original lesson-submission shape ({name, url}), and the
// group-content shape (SubmitGroupContentPayload's mediaFiles, which use
// fileName/originalFileName/cloudinaryUrl — PascalCase once round-tripped
// through the approval payload). Tolerate all of them rather than assuming
// one, since a mismatch here silently produced blank rows and a dead
// download button.
function normalizeMediaFile(f: Record<string, unknown>): { name: string; url: string } {
  const name = String(
    f.name ?? f.Name ??
    f.originalFileName ?? f.OriginalFileName ??
    f.fileName ?? f.FileName ??
    "Untitled file"
  );
  const url = String(
    f.url ?? f.Url ??
    f.cloudinaryUrl ?? f.CloudinaryUrl ??
    f.fileUrl ?? f.FileUrl ??
    ""
  );
  return { name, url };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPayload(raw: Approval["payload"]): ApprovalPayload {
  let parsed: ApprovalPayload = {};
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw) as ApprovalPayload; } catch { return {}; }
  } else {
    parsed = raw as ApprovalPayload ?? {};
  }
  const normalized: Record<string, unknown> = { ...(parsed as Record<string, unknown>) };
  for (const key of Object.keys(normalized)) {
    const camel = key.charAt(0).toLowerCase() + key.slice(1);
    if (camel !== key && !(camel in normalized)) {
      (normalized as Record<string, unknown>)[camel] = normalized[key];
    }
  }
  return normalized as ApprovalPayload;
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}


// ── Header icon ───────────────────────────────────────────────────────────────
function HeaderIcon({ status }: { status: Approval["status"] }) {
  if (status === "approved") return (
    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    </div>
  );
  if (status === "rejected") return (
    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
      <XCircle className="w-4 h-4 text-red-500" />
    </div>
  );
  return (
    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
      <BookOpen className="w-4 h-4 text-orange-500" />
    </div>
  );
}

// ── Media file row ────────────────────────────────────────────────────────────
function MediaFileRow({ name, url }: { name: string; url: string }) {
  return (
    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
      <FileText className="w-4 h-4 text-red-500 shrink-0" />
      <span className="flex-1 text-xs text-gray-600 truncate">{name}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ${name}`}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      ) : (
        <Download className="w-3.5 h-3.5 text-gray-200" aria-hidden="true" />
      )}
    </div>
  );
}

// ── Content media item (from GetContentDetail — real URL + real type) ───────
function ContentMediaItem({ media }: { media: GroupContentDetail["media"][number] }) {
  const type = (media.mediaType || media.fileExtension || "").toLowerCase();
  const label = media.originalFileName || media.fileName || "Media file";

  if (type.includes("image")) {
    return (
      <a
        href={media.cloudinaryUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
        title={label}
      >
        <img src={media.cloudinaryUrl} alt={label} className="w-full h-32 object-cover" />
      </a>
    );
  }
  if (type.includes("video")) {
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
        <video src={media.cloudinaryUrl} controls className="w-full max-h-56" />
      </div>
    );
  }
  if (type.includes("audio")) {
    return (
      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
        <FileAudio className="w-4 h-4 text-blue-500 shrink-0" />
        <audio src={media.cloudinaryUrl} controls className="flex-1 h-8 min-w-0" />
      </div>
    );
  }
  return <MediaFileRow name={label} url={media.cloudinaryUrl} />;
}

// ── Info grid ─────────────────────────────────────────────────────────────────
function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
          <p className="text-sm font-semibold text-gray-800">{value}</p>
        </div>
      ))}
    </div>
  );
}

// ── REJECTION REASONS ─────────────────────────────────────────────────────────
const REJECTION_REASONS = [
  "Incomplete Content",
  "Unclear Objectives",
  "Off - Curriculum",
  "Wrong Media Files",
  "Low Content Quality",
  "Others",
];

// ── Step 1: Review ────────────────────────────────────────────────────────────
function StepReview({
  approval,
  onClose,
  onReject,
  onApprove,
  responding,
}: {
  approval: Approval;
  onClose: () => void;
  onReject: () => void;
  onApprove: () => void;
  responding: boolean;
}) {
  const navigate = useNavigate();
  const payload = getPayload(approval.payload);
  // getPayload only aliases PascalCase keys to camelCase, not the reverse —
  // group-content submissions send `mediaFiles` (lowercase) as sent by the
  // student, which payload.MediaFiles would miss entirely, silently hiding
  // the whole media list instead of just failing to download it.
  const mediaFiles = payload.MediaFiles ?? (payload as any).mediaFiles ?? [];

  const isPending = approval.status?.toLowerCase() === "pending";
  const isApproved = approval.status?.toLowerCase() === "approved";
  const isRejected = approval.status?.toLowerCase() === "rejected";

  const isCreateGroup = approval.operationType === "CreateGroup";
  const isSubmitGroupContent = approval.operationType === "SubmitGroupContent";

  // GetContentDetail carries the real, openable media URLs (and the board
  // recording's studentId) that the approval payload only summarizes as
  // counts/booleans — fetch it for group-content submissions so the reviewer
  // can actually see what the student posted instead of just a file count.
  const detailGroupId = payload.groupId ?? payload.GroupId;
  const detailContentId = approval.entityId ?? payload.contentId ?? payload.ContentId;
  const [contentDetail, setContentDetail] = useState<GroupContentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!isSubmitGroupContent || !detailGroupId || !detailContentId) return;
    let cancelled = false;
    setLoadingDetail(true);
    groupService
      .getContentDetail(detailGroupId, detailContentId)
      .then((res) => {
        if (!cancelled) setContentDetail(res.data.data);
      })
      .catch(() => {
        // Non-fatal — falls back to the payload's summary (aim/mediaCount/hasRecording).
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => { cancelled = true; };
  }, [isSubmitGroupContent, detailGroupId, detailContentId]);

  const hasRecording = contentDetail?.hasRecording ?? payload.hasRecording;
  const useDetailMedia = isSubmitGroupContent && !!contentDetail;

  const display = getApprovalDisplay(approval as any);
  const title = display.title;
  const subjectName = display.subjectName ?? payload.subjectName;
  const className = display.className ?? payload.className;

  const infoItems = isCreateGroup
    ? [
        { label: "Requested by", value: approval.requestedByName },
        { label: "Group Name", value: title },
        { label: "Submitted", value: formatDate(approval.createdAt) },
      ]
    : isSubmitGroupContent
      ? [
          { label: "Requested by", value: approval.requestedByName },
          { label: "Subject", value: subjectName ?? "—" },
          { label: "Class", value: className ?? "—" },
          { label: "Submitted", value: formatDate(approval.createdAt) },
        ]
      : [
          { label: "Teacher", value: approval.requestedByName },
          { label: "Subject", value: subjectName ?? "—" },
          { label: "Class", value: className ?? "—" },
          { label: "Submitted", value: formatDate(approval.createdAt) },
          { label: "Topic", value: payload.topicName ?? payload.Title ?? "—" },
          { label: "Sub-Topic", value: payload.subTopic ?? payload.description ?? "—" },
        ];

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-start gap-3 min-w-0">
          <HeaderIcon status={approval.status} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {[approval.requestedByName, subjectName, className, payload.Term].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        {/* Status banners */}
        {isApproved && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-green-700">Approved</p>
              {approval.respondedByName && approval.respondedAt && (
                <p className="text-xs text-green-600 mt-0.5">
                  Approved by {approval.respondedByName} on {formatDate(approval.respondedAt)}
                </p>
              )}
            </div>
          </div>
        )}
        {isRejected && approval.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-bold text-red-600">Previous rejection reason</p>
            <p className="text-xs text-red-500 leading-relaxed">{approval.rejectionReason}</p>
          </div>
        )}

        {/* Info grid */}
        <InfoGrid items={infoItems} />

        {/* Group content: loading the full submission (real media + recording owner) */}
        {isSubmitGroupContent && loadingDetail && (
          <div className="flex items-center gap-2 text-gray-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading full submission...</span>
          </div>
        )}

        {/* Group content: real description, once fetched */}
        {useDetailMedia && contentDetail!.description && (
          <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
            <span className="font-medium text-gray-700">Description: </span>
            {contentDetail!.description}
          </p>
        )}

        {/* Group content: real, openable media (image/video/audio inline, others as a link) */}
        {useDetailMedia && contentDetail!.media.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">
              Upload Media ({contentDetail!.media.length} {contentDetail!.media.length === 1 ? "File" : "Files"})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {contentDetail!.media.map((m, i) => (
                <ContentMediaItem key={m.id ?? i} media={m} />
              ))}
            </div>
          </div>
        )}

        {/* Fallback media list — non-group-content approvals, or group content
            whose detail hasn't loaded yet / failed to load */}
        {!useDetailMedia && mediaFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">
              Upload Media ({mediaFiles.length} {mediaFiles.length === 1 ? "File" : "Files"})
            </p>
            {mediaFiles.map((f: Record<string, unknown>, i: number) => {
              const { name, url } = normalizeMediaFile(f);
              return <MediaFileRow key={`${name}-${i}`} name={name} url={url} />;
            })}
          </div>
        )}

        {/* Lesson Objectives */}
        {payload.LessonObjectives && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-600">Lesson objectives</p>
            <p className="text-xs text-gray-500 leading-relaxed">{payload.LessonObjectives}</p>
          </div>
        )}

        {/* Lesson Notes */}
        {payload.LessonNotes && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-600">Lesson Notes</p>
            <p className="text-xs text-gray-500 leading-relaxed">{payload.LessonNotes}</p>
          </div>
        )}

        {/* Description — non-group-content, or group content before detail loads */}
        {!useDetailMedia && payload.description && (
          <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
            <span className="font-medium text-gray-700">Description: </span>
            {payload.description}
          </p>
        )}

        {/* Aim */}
        {payload.aim && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-600">Lesson Aim</p>
            <p className="text-xs text-gray-500 leading-relaxed">{payload.aim}</p>
          </div>
        )}

        {/* Media & Recording badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {(contentDetail?.media.length ?? payload.mediaCount) != null && (
            <span className="flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-full">
              <FileText className="w-3.5 h-3.5" />
              {contentDetail?.media.length ?? payload.mediaCount} Media {(contentDetail?.media.length ?? payload.mediaCount) === 1 ? "File" : "Files"}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${hasRecording
            ? "bg-green-50 text-green-600 border-green-100"
            : "bg-gray-50 text-gray-400 border-gray-100"
            }`}>
            {hasRecording ? "🎥 Has Recording" : "🎥 No Recording"}
          </span>
        </div>

        {/* Watch the student's board recording */}
        {isSubmitGroupContent && hasRecording && (
          <button
            type="button"
            disabled={!contentDetail?.createdBy || !detailGroupId}
            onClick={() => {
              if (!contentDetail?.createdBy || !detailGroupId) return;
              const prefix = window.location.pathname.startsWith("/admin") ? "/admin" : "/teacher";
              navigate(`${prefix}/approvals/recording/${detailGroupId}/${contentDetail.createdBy}`);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#292382] hover:bg-[#292382]/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayCircle className="w-4 h-4" />
            {loadingDetail ? "Loading recording..." : "Watch Board Recording"}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 pt-4 border-t border-gray-100 shrink-0">
        {isPending ? (
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
              Close
            </button>
            <button onClick={onReject} disabled={responding}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-red-600 border border-red-300 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50">
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button onClick={onApprove} disabled={responding}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50">
              {responding
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />}
              Approve
            </button>
          </div>
        ) : (
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
            Close
          </button>
        )}
      </div>
    </>
  );
}

// ── Step 2: Reject ────────────────────────────────────────────────────────────
function StepReject({
  approval,
  onBack,
  onClose,
  onConfirm,
  responding,
}: {
  approval: Approval;
  onBack: () => void;
  onClose: () => void;
  onConfirm: (reason: string, feedback: string, notifyEmail: boolean) => void;
  responding: boolean;
}) {
  const payload = getPayload(approval.payload);
  const display = getApprovalDisplay(approval as any);
  const title = display.title;
  const subjectName = display.subjectName ?? payload.subjectName;
  const className = display.className ?? payload.className;
  const [selectedReason, setSelectedReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);

  const canSubmit = selectedReason && feedback.trim().length > 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Reject lesson submission</p>
            <p className="text-xs text-gray-400 mt-0.5">Provide a reason and feedback for the teacher</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5 overflow-y-auto flex-1">
        {/* Lesson context pill */}
        <div className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {[approval.requestedByName, subjectName, className, payload.Term].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {/* Rejection reason */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700">
            Rejection reason<span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REJECTION_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedReason(r)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all ${selectedReason === r
                  ? "border-[#4F61E8] bg-indigo-50 text-[#4F61E8]"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedReason === r ? "border-[#4F61E8]" : "border-gray-300"
                  }`}>
                  {selectedReason === r && <div className="w-1.5 h-1.5 rounded-full bg-[#4F61E8]" />}
                </div>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700">
            Feedback To Teacher<span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
              placeholder="Write a specific feedback to the teacher he/she can know what to fix and resubmit"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#4F61E8]/20 focus:border-[#4F61E8] transition placeholder:text-gray-300"
            />
            <div className="flex items-center justify-between px-1 mt-1">
              <p className="text-[10px] text-gray-400">Be clear and constructive</p>
              <p className="text-[10px] text-gray-400">{feedback.length}/500</p>
            </div>
          </div>
        </div>

        {/* Notify toggle */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotifyEmail((v) => !v)}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${notifyEmail ? "bg-[#4F61E8]" : "bg-gray-300"}`}
              style={{ height: "22px" }}
            >
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${notifyEmail ? "left-[22px]" : "left-0.5"}`} />
            </button>
            <div>
              <p className="text-xs font-semibold text-gray-700">Notify teacher via email</p>
              <p className="text-[10px] text-gray-400">{approval.requestedByName} will receive this feedback by email</p>
            </div>
          </div>
          <Mail className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 pt-4 border-t border-gray-100 flex gap-2 shrink-0">
        <button onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(selectedReason, feedback, notifyEmail)}
          disabled={!canSubmit || responding}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {responding
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <XCircle className="w-4 h-4" />}
          Send Rejection
        </button>
      </div>
    </>
  );
}

// ── Root Modal ────────────────────────────────────────────────────────────────
type ModalStep = "review" | "reject";

interface ApprovalReviewModalProps {
  approval: Approval;
  onClose: () => void;
  onRespond: (id: string, approved: boolean, reason?: string, feedback?: string) => Promise<void>;
  responding: string | null;
}

export default function ApprovalReviewModal({
  approval,
  onClose,
  onRespond,
  responding,
}: ApprovalReviewModalProps) {
  const [step, setStep] = useState<ModalStep>("review");
  const isResponding = responding === approval.id;

  const handleApprove = async () => {
    await onRespond(approval.id, true);
    onClose();
  };

  const handleRejectConfirm = async (reason: string, feedback: string, _notify: boolean) => {
    await onRespond(approval.id, false, reason, feedback);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {step === "review" && (
          <StepReview
            approval={approval}
            onClose={onClose}
            onReject={() => setStep("reject")}
            onApprove={handleApprove}
            responding={isResponding}
          />
        )}
        {step === "reject" && (
          <StepReject
            approval={approval}
            onBack={() => setStep("review")}
            onClose={onClose}
            onConfirm={handleRejectConfirm}
            responding={isResponding}
          />
        )}
      </div>
    </div>
  );
}