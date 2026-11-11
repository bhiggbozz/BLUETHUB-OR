import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose, Button } from "@bluethub/ui-kit";
import { Image as ImageIcon, FileText, Video, X, FolderOpen, Loader2, Radio } from "lucide-react";
import { lessonService, type LessonMediaDto } from "@/services/lesson";
import { encodeMediaMessage, decodeMediaMessage } from "@/utils/live-media-data-channel";

/** The LiveKit "media" topic surface this panel needs — structurally
 * satisfied by `useLiveClassAudio()`'s return value, passed straight
 * through like `BoardDataChannel` is for the board. Independent of that
 * channel; sharing the one `Room` connection is just a convenience. */
export interface MediaDataChannel {
  sendMediaData: (bytes: Uint8Array, destinationIdentities?: string[]) => void;
  onMediaData: (handler: (payload: Uint8Array, senderId: string) => void) => () => void;
  onParticipantConnected: (handler: (identity: string) => void) => () => void;
}

interface LessonMediaPanelProps {
  /** The lesson a live class was started from — its attached media (dropped
   * by the teacher before the class, during lesson submission) is what's
   * available here, for both the teacher and every student. */
  lessonId: string;
  /** True only for the teacher — lets them broadcast which file they're
   * currently viewing to everyone else via `mediaChannel`. Omitted (student)
   * means this panel only ever receives that broadcast. */
  isTeacher?: boolean;
  /** The teacher's LiveKit identity — students only trust media-sync
   * messages from this sender, same rule `LiveBoard` applies to strokes. */
  teacherId?: string;
  /** LiveKit data-channel surface for the "media" topic. Omitted entirely
   * disables sync (panel still works as plain independent browsing). */
  mediaChannel?: MediaDataChannel;
}

const resolveKind = (mediaType: string, ext: string): "image" | "video" | "pdf" => {
  const mt = (mediaType ?? "").toLowerCase();
  const e = (ext ?? "").toLowerCase().replace(/^\./, "");
  if (mt.includes("video") || ["mp4", "webm", "mov", "m4v"].includes(e)) return "video";
  if (mt.includes("image") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(e)) return "image";
  return "pdf";
};

/** Browses the media already attached to the lesson a live class was
 * started from. Self-contained REST fetch + local state — no Redux, no
 * session-context, nothing shared with the existing recorder's media panel. */
export default function LessonMediaPanel({ lessonId, isTeacher, teacherId, mediaChannel }: LessonMediaPanelProps) {
  const [media, setMedia] = useState<LessonMediaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<LessonMediaDto | null>(null);
  const [open, setOpen] = useState(false);
  /** Student side only: the mediaId the teacher last broadcast as open, or
   * null once they've broadcast "close". Separate from `active`/`open`
   * above so a student's own browsing never gets clobbered by the sync. */
  const [presentedMediaId, setPresentedMediaId] = useState<string | null>(null);

  // Teacher: broadcast whatever they're currently viewing — "viewing a file
  // in this panel" and "showing it to the class" are treated as the same
  // thing, so there's no separate present/unpresent control to miss.
  useEffect(() => {
    if (!isTeacher || !mediaChannel) return;
    const msg = active ? ({ t: "open", mediaId: active.id } as const) : ({ t: "close" } as const);
    mediaChannel.sendMediaData(encodeMediaMessage(msg));
  }, [isTeacher, mediaChannel, active]);

  // Teacher: a student who joins mid-class has no way to know what's
  // already open — send them the current state directly (the brief's
  // "media-state message with what is open now" on ParticipantConnected).
  useEffect(() => {
    if (!isTeacher || !mediaChannel) return;
    return mediaChannel.onParticipantConnected((identity) => {
      const msg = active ? ({ t: "open", mediaId: active.id } as const) : ({ t: "close" } as const);
      mediaChannel.sendMediaData(encodeMediaMessage(msg), [identity]);
    });
  }, [isTeacher, mediaChannel, active]);

  // Student: follow whatever the teacher broadcasts, auto-opening this
  // panel to match — if the file isn't in `media` yet (still downloading
  // the list), the render below falls back to a "downloading" placeholder.
  useEffect(() => {
    if (isTeacher || !mediaChannel || !teacherId) return;
    return mediaChannel.onMediaData((payload, senderId) => {
      if (senderId !== teacherId) return; // the actual security rule — LiveKit doesn't enforce this
      const msg = decodeMediaMessage(payload);
      if (!msg) return;
      if (msg.t === "close") {
        setPresentedMediaId(null);
        return;
      }
      setPresentedMediaId(msg.mediaId);
      setOpen(true);
    });
  }, [isTeacher, mediaChannel, teacherId]);

  // Student: once the presented file shows up in the downloaded list,
  // jump the detail view to it.
  useEffect(() => {
    if (isTeacher || !presentedMediaId) return;
    const found = media.find((m) => m.id === presentedMediaId);
    if (found) setActive(found);
  }, [isTeacher, presentedMediaId, media]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    lessonService
      .getLessonForClass(lessonId)
      .then((res) => {
        if (cancelled) return;
        setMedia(res.data.data?.media ?? []);
      })
      .catch(() => {
        if (!cancelled) setMedia([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setActive(null); }}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" title="Lesson media" className="relative gap-1.5">
          <FolderOpen className="size-4" />
          Media{media.length > 0 ? ` (${media.length})` : ""}
          {!isTeacher && presentedMediaId && !open && (
            <span className="absolute -right-1 -top-1 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-80 overflow-hidden rounded-lg border border-gray-200 p-0 shadow-lg">
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 p-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
            <FolderOpen className="size-4" /> Lesson media
          </h4>
          <PopoverClose className="rounded-full p-1 text-white/90 hover:bg-white/20">
            <X className="size-4" />
          </PopoverClose>
        </div>

        {presentedMediaId && !active && !isTeacher ? (
          <div className="p-6 text-center text-xs text-gray-400">
            <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
            Being displayed by your teacher — downloading…
          </div>
        ) : active ? (
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => setActive(null)} className="text-xs font-medium text-blue-600 hover:underline">
                ← Back to list
              </button>
              {(isTeacher ? !!mediaChannel : presentedMediaId === active.id) && (
                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                  <Radio className="size-3" /> {isTeacher ? "Showing to class" : "Teacher is showing this"}
                </span>
              )}
            </div>
            {(() => {
              const kind = resolveKind(active.mediaType, active.fileExtension);
              if (kind === "image") {
                return (
                  <img
                    src={active.cloudinaryUrl}
                    alt={active.originalFileName}
                    className="max-h-64 w-full rounded object-contain"
                  />
                );
              }
              if (kind === "video") {
                return <video src={active.cloudinaryUrl} controls className="max-h-64 w-full rounded" />;
              }
              return (
                <a
                  href={active.cloudinaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded border border-gray-200 p-4 text-center text-sm text-blue-600 hover:bg-gray-50"
                >
                  Open {active.originalFileName}
                </a>
              );
            })()}
          </div>
        ) : loading ? (
          <div className="p-6 text-center text-xs text-gray-400">Loading…</div>
        ) : media.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No media attached to this lesson yet.</div>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto p-2">
            {media
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((m) => {
                const kind = resolveKind(m.mediaType, m.fileExtension);
                const Icon = kind === "image" ? ImageIcon : kind === "video" ? Video : FileText;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActive(m)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-gray-50"
                  >
                    <Icon className="size-4 shrink-0 text-gray-400" />
                    <span className="truncate">{m.originalFileName}</span>
                  </button>
                );
              })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
