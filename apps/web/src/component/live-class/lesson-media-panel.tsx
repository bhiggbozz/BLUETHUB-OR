import { useCallback, useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose, Button, Dialog, DialogContent } from "@bluethub/ui-kit";
import { Image as ImageIcon, FileText, Video, X, FolderOpen, Loader2, Radio, Lock, RefreshCw, AlertTriangle } from "lucide-react";
import { lessonService, type LessonMediaDto } from "@/services/lesson";
import type { LiveClassMedia } from "@/services/live-class";
import { encodeMediaMessage, decodeMediaMessage } from "@/utils/live-media-data-channel";
import { warmLiveClassMediaCache, type MediaDownloadState } from "@/utils/lesson-media-cache";
import PdfScrollViewer from "@/component/pdf-scroll-viewer";

/** The LiveKit "media" topic surface this panel needs — structurally
 * satisfied by `useLiveClassAudio()`'s return value, passed straight
 * through like `BoardDataChannel` is for the board. Independent of that
 * channel; sharing the one `Room` connection is just a convenience. */
export interface MediaDataChannel {
  sendMediaData: (bytes: Uint8Array, destinationIdentities?: string[]) => void;
  onMediaData: (handler: (payload: Uint8Array, senderId: string) => void) => () => void;
  onParticipantConnected: (handler: (identity: string) => void) => () => void;
}

/** Internal shape both media sources get normalized into — `LessonMediaDto`
 * (teacher-only `GET api/lessons/{id}/class`) and `LiveClassMedia` (the
 * student-safe path, off the live class itself) use different field names
 * for the same things. */
interface PanelMediaItem {
  id: string;
  fileName: string;
  mediaType: string;
  fileExtension: string;
  url: string;
  displayOrder: number;
}

const fromLessonMedia = (m: LessonMediaDto): PanelMediaItem => ({
  id: m.id,
  fileName: m.originalFileName,
  mediaType: m.mediaType,
  fileExtension: m.fileExtension,
  url: m.cloudinaryUrl,
  displayOrder: m.displayOrder,
});

const fromLiveClassMedia = (m: LiveClassMedia): PanelMediaItem => ({
  id: m.id,
  fileName: m.name,
  mediaType: m.mediaType,
  fileExtension: m.fileExtension,
  url: m.url,
  displayOrder: m.displayOrder,
});

interface LessonMediaPanelProps {
  /** Teacher path only: triggers the internal `GET api/lessons/{id}/class`
   * fetch. That endpoint is teacher-only and returns 403 for a student
   * token by design — never pass this when rendering for a student. */
  lessonId?: string;
  /** Student path: the live class's own media list, already resolved (from
   * the join response or `GET api/live-class/{id}`) — no fetch needed, and
   * every file gets pre-downloaded into the Cache API as soon as this is
   * supplied, rather than waiting for the teacher to open one. The backend
   * sends `null`, not `[]`, when nothing's attached. */
  media?: LiveClassMedia[] | null;
  /** Required whenever `media` is supplied — scopes the local Cache API
   * entries so files from different classes never collide. */
  liveClassId?: string;
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

/** Browses the media attached to a live class. Teacher: fetches the lesson's
 * full media list itself. Student: never fetches anything — the list comes
 * in as a prop (the live class already carries it), and every file is
 * pre-downloaded into the Cache API the moment that list arrives, instead of
 * waiting for the teacher to open a file and then trying to "download" it
 * live. Self-contained local state otherwise — no Redux, no session-context. */
export default function LessonMediaPanel({
  lessonId,
  media: mediaProp,
  liveClassId,
  isTeacher,
  teacherId,
  mediaChannel,
}: LessonMediaPanelProps) {
  const [media, setMedia] = useState<PanelMediaItem[]>([]);
  const [loading, setLoading] = useState(!!lessonId);
  const [mediaError, setMediaError] = useState(false);
  const [active, setActive] = useState<PanelMediaItem | null>(null);
  const [open, setOpen] = useState(false);
  /** Student path only: per-file Cache API warm-up state, keyed by media id.
   * Absent === still in flight. Teacher path never populates this — the
   * viewer below treats "no entry" as "nothing to wait for" either way. */
  const [downloadState, setDownloadState] = useState<Record<string, MediaDownloadState>>({});
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<Record<string, string>>({});
  /** Student side only: the mediaId the teacher last broadcast as open, or
   * null once they've broadcast "close". Separate from `active`/`open`
   * above so a student's own browsing never gets clobbered by the sync. */
  const [presentedMediaId, setPresentedMediaId] = useState<string | null>(null);
  /** Teacher side only: their own current page while `active` is a PDF —
   * fed by `PdfScrollViewer`'s `onPageChange`, and the thing that gets
   * broadcast below. Sibling of the open/close broadcast, not a replacement. */
  const [teacherPdfPage, setTeacherPdfPage] = useState(1);
  /** Student side only: the page the teacher last broadcast for the
   * currently presented PDF. */
  const [presentedPage, setPresentedPage] = useState(1);
  /** Student side only: true while their PDF view should keep jumping to
   * `presentedPage` — flips off the moment they scroll on their own
   * (mirrors the existing replay-mode "auto follow" toggle in reply.tsx),
   * and back on whenever a (possibly new) file opens. */
  const [followPdf, setFollowPdf] = useState(true);
  const lastSentPdfPageRef = useRef<number | null>(null);

  // Teacher: a newly-opened file always starts at page 1 — without this,
  // switching from a page deep in one PDF to a brand new one would briefly
  // broadcast the old page number tagged with the new file's id.
  useEffect(() => {
    if (!isTeacher) return;
    setTeacherPdfPage(1);
    lastSentPdfPageRef.current = null;
  }, [isTeacher, active?.id]);

  // Teacher: broadcast whatever they're currently viewing — "viewing a file
  // in this panel" and "showing it to the class" are treated as the same
  // thing, so there's no separate present/unpresent control to miss.
  useEffect(() => {
    if (!isTeacher || !mediaChannel) return;
    const msg = active ? ({ t: "open", mediaId: active.id } as const) : ({ t: "close" } as const);
    mediaChannel.sendMediaData(encodeMediaMessage(msg));
  }, [isTeacher, mediaChannel, active]);

  // Teacher: broadcast their current PDF page separately — only while a PDF
  // is actually open, and only when it actually changes.
  useEffect(() => {
    if (!isTeacher || !mediaChannel || !active) return;
    if (lastSentPdfPageRef.current === teacherPdfPage) return;
    lastSentPdfPageRef.current = teacherPdfPage;
    mediaChannel.sendMediaData(encodeMediaMessage({ t: "page", mediaId: active.id, page: teacherPdfPage }));
  }, [isTeacher, mediaChannel, active, teacherPdfPage]);

  // Teacher: a student who joins mid-class has no way to know what's
  // already open — send them the current state directly (the brief's
  // "media-state message with what is open now" on ParticipantConnected).
  useEffect(() => {
    if (!isTeacher || !mediaChannel) return;
    return mediaChannel.onParticipantConnected((identity) => {
      const msg = active ? ({ t: "open", mediaId: active.id } as const) : ({ t: "close" } as const);
      mediaChannel.sendMediaData(encodeMediaMessage(msg), [identity]);
      if (active) {
        mediaChannel.sendMediaData(
          encodeMediaMessage({ t: "page", mediaId: active.id, page: teacherPdfPage }),
          [identity]
        );
      }
    });
  }, [isTeacher, mediaChannel, active, teacherPdfPage]);

  // Student: follow whatever the teacher broadcasts, auto-opening this
  // panel to match. The file itself should already be cached (or caching)
  // by now — the media list came in with the live class, not from a fetch
  // triggered by this broadcast.
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
      if (msg.t === "page") {
        if (msg.mediaId === presentedMediaId) setPresentedPage(msg.page);
        return;
      }
      setPresentedMediaId(msg.mediaId);
      setPresentedPage(1);
      setFollowPdf(true);
      setOpen(true);
    });
  }, [isTeacher, mediaChannel, teacherId, presentedMediaId]);

  // Student: once the presented file shows up in the list, jump the detail
  // view to it. The list is a prop now (no fetch), so this resolves on the
  // very next render rather than waiting on a network round trip.
  useEffect(() => {
    if (isTeacher || !presentedMediaId) return;
    const found = media.find((m) => m.id === presentedMediaId);
    if (found) setActive(found);
  }, [isTeacher, presentedMediaId, media]);

  // Teacher path: fetch the lesson's full media list. Never used for a
  // student render — `GET api/lessons/{id}/class` is teacher-only and 403s
  // for a student token by design.
  const loadMedia = useCallback(() => {
    if (!lessonId) return () => {};
    let cancelled = false;
    setLoading(true);
    setMediaError(false);
    lessonService
      .getLessonForClass(lessonId)
      .then((res) => {
        if (cancelled) return;
        setMedia((res.data.data?.media ?? []).map(fromLessonMedia));
      })
      .catch(() => {
        if (cancelled) return;
        setMedia([]);
        setMediaError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  useEffect(() => loadMedia(), [loadMedia]);

  // Student path: the list arrives as a prop — normalize it and kick off a
  // background download of every file into the Cache API right away,
  // instead of waiting for the teacher to open one and discovering only
  // then whether it's reachable.
  useEffect(() => {
    if (!mediaProp) return;
    const items = mediaProp.slice().sort((a, b) => a.displayOrder - b.displayOrder).map(fromLiveClassMedia);
    setMedia(items);
    setLoading(false);
    setDownloadState({});

    if (!liveClassId || items.length === 0) return;
    void warmLiveClassMediaCache(
      liveClassId,
      items.map((m) => ({ id: m.id, url: m.url })),
      (mediaId, state, blobUrl) => {
        setDownloadState((prev) => ({ ...prev, [mediaId]: state }));
        if (blobUrl) {
          blobUrlsRef.current[mediaId] = blobUrl;
          setBlobUrls((prev) => ({ ...prev, [mediaId]: blobUrl }));
        }
      }
    );
  }, [mediaProp, liveClassId]);

  // Release every blob URL this instance created once it's gone for good —
  // these are only ever consumed within this one room session.
  useEffect(() => {
    return () => {
      Object.values(blobUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Once a file is actually open, present it full-screen instead of inside
  // the small dropdown it was browsed/announced from.
  useEffect(() => {
    if (active) setOpen(false);
  }, [active]);

  return (
    <>
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
            Your teacher is showing a file that isn't in this class's media list.
          </div>
        ) : active ? null : loading ? (
          <div className="p-6 text-center text-xs text-gray-400">Loading…</div>
        ) : mediaError ? (
          <div className="p-6 text-center text-xs text-gray-400">
            <p className="mb-2">Couldn't load this lesson's media.</p>
            <Button size="sm" variant="outline" onClick={loadMedia} className="gap-1.5">
              <RefreshCw className="size-3.5" /> Retry
            </Button>
          </div>
        ) : media.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No media attached to this lesson yet.</div>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto p-2">
            {media.map((m) => {
              const kind = resolveKind(m.mediaType, m.fileExtension);
              const Icon = kind === "image" ? ImageIcon : kind === "video" ? Video : FileText;
              const state = downloadState[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() => setActive(m)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-gray-50"
                >
                  <Icon className="size-4 shrink-0 text-gray-400" />
                  <span className="truncate">{m.fileName}</span>
                  {state === "error" && <AlertTriangle className="ml-auto size-3.5 shrink-0 text-amber-500" />}
                  {!isTeacher && mediaProp && state === undefined && (
                    <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin text-gray-300" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>

    <Dialog open={!!active} onOpenChange={(next) => { if (!next) setActive(null); }}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        {active && (() => {
          // Teacher path never tracks download state (nothing was pre-fetched
          // for them) — only gate the view when we actually attempted a
          // background download for this file, i.e. the student path.
          const state = !isTeacher && mediaProp ? downloadState[active.id] : "ready";
          return (
            <>
              <div className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-3 pr-12">
                <span className="truncate text-sm font-medium text-gray-700">{active.fileName}</span>
                {(isTeacher ? !!mediaChannel : presentedMediaId === active.id) && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                    <Radio className="size-3" /> {isTeacher ? "Showing to class" : "Teacher is showing this"}
                  </span>
                )}
              </div>
              {/* overflow-hidden, not overflow-auto: the PDF branch owns its
                  own internal scroll container (PdfScrollViewer), which the
                  page-sync code drives directly via scrollTop. A second,
                  independently-scrollable ancestor here competes with that —
                  if this one ends up as the element that actually overflows,
                  setting scrollTop on the inner one becomes a no-op and the
                  student's view never follows the teacher's page. */}
              <div className="min-h-0 flex-1 overflow-hidden bg-gray-100 p-3">
                {state === "error" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
                    <AlertTriangle className="size-6 text-amber-500" />
                    This file couldn't be downloaded.
                  </div>
                ) : state !== "ready" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
                    <Loader2 className="size-6 animate-spin" />
                    Preparing materials…
                  </div>
                ) : (
                  (() => {
                    const src = blobUrls[active.id] ?? active.url;
                    const kind = resolveKind(active.mediaType, active.fileExtension);
                    if (kind === "image") {
                      return (
                        <img
                          src={src}
                          alt={active.fileName}
                          className="mx-auto h-full max-h-full w-auto max-w-full rounded object-contain"
                        />
                      );
                    }
                    if (kind === "video") {
                      return (
                        <video
                          src={src}
                          controls
                          autoPlay={!isTeacher}
                          className="mx-auto h-full max-h-full w-auto max-w-full rounded"
                        />
                      );
                    }
                    // PDF: an inline, page-synced viewer instead of a plain
                    // "open in a new tab" link — the teacher's own scroll
                    // position drives `onPageChange` (broadcast above); the
                    // student's view is driven back by `controlledPage`,
                    // reusing the exact same controller/follower wiring
                    // `component/reply.tsx` already uses for replay playback
                    // (`mode="replay"` + `controlledPage` +
                    // `onScrollRatioChange` to drop out of auto-follow).
                    return (
                      <div className="flex h-full flex-col gap-1.5">
                        {!isTeacher && !followPdf && (
                          <button
                            type="button"
                            onClick={() => setFollowPdf(true)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
                          >
                            <Lock className="size-3" /> Paused — tap to follow your teacher again
                          </button>
                        )}
                        <div className="min-h-0 flex-1 overflow-hidden rounded border border-gray-200 bg-white">
                          <PdfScrollViewer
                            fileUrl={src}
                            mode={isTeacher ? "live" : "replay"}
                            controlledPage={!isTeacher && followPdf ? presentedPage : undefined}
                            onPageChange={isTeacher ? setTeacherPdfPage : undefined}
                            onScrollRatioChange={!isTeacher ? () => setFollowPdf(false) : undefined}
                          />
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
    </>
  );
}
