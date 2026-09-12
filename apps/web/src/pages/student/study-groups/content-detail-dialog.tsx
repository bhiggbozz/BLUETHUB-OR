import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { Dialog, DialogContent, DialogTitle } from "@bluethub/ui-kit";
import {
  AlertCircle,
  Clock,
  Download,
  FileAudio,
  FileText,
  LayoutGrid,
  Loader2,
  Lock,
  PlayCircle,
  X,
} from "lucide-react";
import { groupService, type GroupContentDetail } from "@/services/groups";

interface ContentDetailDialogProps {
  groupId: string;
  contentId: string | null;
  onClose: () => void;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// A board-snapshot media item ("just write, no recording") is named
// board-N.png / Board N.png by board-snapshot-tool.tsx — detect by name
// rather than mediaType, since the backend currently mis-reports these as
// "Document" instead of "Image" (see approval-review-modal.tsx for the same
// workaround on the teacher side).
const BOARD_SNAPSHOT_NAME = /^board[\s-]?(\d+)\.png$/i;

function boardSnapshotNumber(media: GroupContentDetail["media"][number]): number | null {
  const match = BOARD_SNAPSHOT_NAME.exec(media.fileName || "") ?? BOARD_SNAPSHOT_NAME.exec(media.originalFileName || "");
  return match ? Number(match[1]) : null;
}

function MediaItem({ media, onPreview }: { media: GroupContentDetail["media"][number]; onPreview: (url: string, label: string) => void }) {
  const type = (media.mediaType || media.fileExtension || "").toLowerCase();
  const label = media.originalFileName || media.fileName || "Media file";

  if (type.includes("image")) {
    return (
      <button
        type="button"
        onClick={() => onPreview(media.cloudinaryUrl, label)}
        className="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
        title={label}
      >
        <img src={media.cloudinaryUrl} alt={label} className="w-full h-32 object-cover" />
      </button>
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
  return (
    <a href={media.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors">
      <FileText className="w-4 h-4 text-red-500 shrink-0" />
      <span className="flex-1 text-xs text-gray-600 truncate">{label}</span>
      <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
    </a>
  );
}

function BoardThumb({ media, number, onPreview }: { media: GroupContentDetail["media"][number]; number: number; onPreview: (url: string, label: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPreview(media.cloudinaryUrl, `Board ${number}`)}
      className="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
      title={`Board ${number}`}
    >
      <img src={media.cloudinaryUrl} alt={`Board ${number}`} className="w-full h-28 object-cover bg-white" />
      <p className="text-[11px] font-semibold text-gray-600 text-center py-1 bg-gray-50 border-t border-gray-100">Board {number}</p>
    </button>
  );
}

function ImageLightbox({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <img
        src={url}
        alt={label}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
      />
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/80">{label}</p>
    </div>
  );
}

/**
 * Full detail for one piece of study-group content — reachable by the
 * creator any time, and by other members only once GroupService's own
 * Approved-only rule lets GetContentDetail return it (still enforced
 * server-side even though the group-detail list is already pre-filtered).
 *
 * GroupController maps every non-success response to HTTP 400, so errors
 * are told apart by the body's responseCode/responseMessage, not the HTTP
 * status — a plain status check would never distinguish "not found" from
 * "still pending" from "forbidden" here.
 */
const ContentDetailDialog = ({ groupId, contentId, onClose }: ContentDetailDialogProps) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<GroupContentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => {
    if (!contentId) {
      setDetail(null);
      setErrorMsg("");
      setAwaitingApproval(false);
      setPreviewImage(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMsg("");
    setAwaitingApproval(false);
    setPreviewImage(null);
    groupService
      .getContentDetail(groupId, contentId)
      .then((res) => {
        if (!cancelled) setDetail(res.data.data);
      })
      .catch((err) => {
        if (cancelled) return;
        const body = err instanceof AxiosError ? err.response?.data : null;
        const code = body?.responseCode as string | undefined;
        const message = body?.responseMessage as string | undefined;
        if (code === "AX1003" && message?.toLowerCase().includes("awaiting approval")) {
          setAwaitingApproval(true);
        } else {
          setErrorMsg(message || "Couldn't load this content.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [groupId, contentId]);

  const boardSnapshots = (detail?.media ?? [])
    .filter((m) => boardSnapshotNumber(m) !== null)
    .sort((a, b) => (boardSnapshotNumber(a) ?? 0) - (boardSnapshotNumber(b) ?? 0));
  const otherMedia = (detail?.media ?? []).filter((m) => boardSnapshotNumber(m) === null);

  return (
    <Dialog open={!!contentId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[92%] rounded-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-sm font-bold text-gray-900">
            {detail?.aim || "Content"}
          </DialogTitle>
          {detail && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {[detail.subjectName, detail.subTopic, detail.createdByName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}

          {!loading && awaitingApproval && (
            <div className="flex flex-col items-center text-center gap-2 py-8">
              <Lock className="w-8 h-8 text-amber-300" />
              <p className="text-sm font-semibold text-gray-700">Awaiting approval</p>
              <p className="text-xs text-gray-400 max-w-xs">
                This hasn't been approved by your class teacher yet, so only the person who submitted it can view it right now.
              </p>
            </div>
          )}

          {!loading && !awaitingApproval && errorMsg && (
            <div className="flex flex-col items-center text-center gap-2 py-8">
              <AlertCircle className="w-8 h-8 text-red-300" />
              <p className="text-sm font-medium text-gray-600">{errorMsg}</p>
            </div>
          )}

          {!loading && detail && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
                  <Clock className="w-3 h-3" /> {formatDate(detail.createdAt)}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                  detail.status === "Approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : detail.status === "Rejected" ? "bg-red-50 text-red-500 border-red-200"
                    : "bg-amber-50 text-amber-600 border-amber-200"
                }`}>
                  {detail.status}
                </span>
              </div>

              {detail.status === "Rejected" && detail.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-xs font-bold text-red-600">Rejection reason</p>
                  <p className="text-xs text-red-500 leading-relaxed">{detail.rejectionReason}</p>
                </div>
              )}

              {detail.description && (
                <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">
                  {detail.description}
                </p>
              )}

              {boardSnapshots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-gray-400" />
                    Boards ({boardSnapshots.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {boardSnapshots.map((m, i) => (
                      <BoardThumb
                        key={m.id ?? i}
                        media={m}
                        number={boardSnapshotNumber(m) ?? i + 1}
                        onPreview={(url, label) => setPreviewImage({ url, label })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {otherMedia.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Media ({otherMedia.length} {otherMedia.length === 1 ? "file" : "files"})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {otherMedia.map((m, i) => (
                      <MediaItem
                        key={m.id ?? i}
                        media={m}
                        onPreview={(url, label) => setPreviewImage({ url, label })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Strict === true, not just truthy — some responses have sent
                  this back as the literal string "false", which is truthy
                  in JS and would otherwise show the button with nothing to
                  watch. */}
              {(detail.hasRecording as unknown) === true && (
                <button
                  type="button"
                  onClick={() => navigate(`/student/study-groups/${groupId}/recording/${contentId}`)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-student-chestnut hover:bg-student-chestnut/90 rounded-xl transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  Watch Board Recording
                </button>
              )}
            </>
          )}
        </div>
      </DialogContent>

      {previewImage && (
        <ImageLightbox
          url={previewImage.url}
          label={previewImage.label}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </Dialog>
  );
};

export default ContentDetailDialog;
