import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import { X } from "lucide-react";
import { getImage } from "@/services/class-media";
import { useState, useEffect } from "react";
import * as React from "react";
import { clearSelectedImage } from "@/store/class-action-slice";
import { useSession } from "@/contexts/session-context";
import { fetchMediaWithAuthFallback } from "@/utils/blob";
import { LESSON_MEDIA_CACHE, buildLessonScopedCacheKey } from "@/utils/lesson-media-cache";
import PdfScrollViewer from "@/component/pdf-scroll-viewer";

const getFileExtension = (nameOrUrl?: string): string => {
  if (!nameOrUrl) return '';
  try {
    const clean = nameOrUrl.split('?')[0].split('#')[0];
    const last = clean.split('.').pop() ?? '';
    return last.toLowerCase();
  } catch {
    return '';
  }
};

const OFFICE_DOC_EXTENSIONS = new Set(['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']);

const getRecordingElapsedMs = (timerElapsedSeconds: number, sessionId?: string): number => {
  const recordingSessionId = localStorage.getItem('recordingStartSessionId') ?? '';
  const recordingStartTimerMs = !sessionId || recordingSessionId === sessionId
    ? parseInt(localStorage.getItem('recordingStartTimerMs') ?? '0', 10)
    : 0;
  return Math.max(0, Math.round(timerElapsedSeconds * 1000) - recordingStartTimerMs);
};

const getFrameSizeByType = (type?: string): string => {
  const mediaType = (type ?? '').toLowerCase();

  if (mediaType === 'pdf') {
    return 'w-[min(94vw,1100px)] h-[min(88vh,980px)]';
  }

  if (mediaType === 'video') {
    return 'w-[min(86vw,900px)] h-[min(66vh,620px)]';
  }

  return 'w-[min(82vw,820px)] h-[min(62vh,560px)]';
};

const MediaFrame = () => {
  const selectedImage = useSelector((state: RootState) => state.action.selectedImage);
  const sessionIdRef = useSelector((state: RootState) => state.action.sessionIdRef);
  const timerDisplay = useSelector((state: RootState) => state.action.timerDisplay);
  const timerElapsedSeconds = useSelector((state: RootState) => state.action.timerElapsedSeconds);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoEventReady, setIsVideoEventReady] = useState(false);
  const dispatch = useDispatch();
  const { sendMediaHide, sendMediaPlayback } = useSession();
  const frameSize = getFrameSizeByType(selectedImage?.type);
  const fileExt = getFileExtension(selectedImage?.name) || getFileExtension(selectedImage?.url);
  const normalizedType = (selectedImage?.type ?? '').toLowerCase();
  const isOfficeDoc = OFFICE_DOC_EXTENSIONS.has(fileExt);
  const isPdf = normalizedType === 'pdf' && !isOfficeDoc;
  const isVideo = normalizedType === 'video';
  const isImage = normalizedType === 'image';
  const officeViewerUrl = mediaUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(mediaUrl)}`
    : null;


  const cacheBlobUrlRef = React.useRef<string | null>(null);
  const getActiveLessonId = (): string | null => {
    try {
      const raw = sessionStorage.getItem("activeLesson");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { lesson?: { id?: string } };
      return parsed.lesson?.id ?? null;
    } catch {
      return null;
    }
  };

  // Load media URL from cache when selectedImage changes
  useEffect(() => {
    const loadMedia = async () => {
      if (selectedImage && selectedImage.id) {
        setIsLoading(true);
        try {
          if (selectedImage.type === 'pdf') {
            if (typeof window !== "undefined" && "caches" in window) {
              try {
                const cache = await caches.open(LESSON_MEDIA_CACHE);
                const lessonId = getActiveLessonId();
                const lessonScopedKey = lessonId ? buildLessonScopedCacheKey(lessonId, selectedImage.url) : null;
                let response = await cache.match(selectedImage.url);
                if (!response && lessonScopedKey) {
                  response = await cache.match(lessonScopedKey);
                }

                if (!response) {
                  const fetched = await fetchMediaWithAuthFallback(selectedImage.url);
                  if (fetched.ok) {
                    await cache.put(selectedImage.url, fetched.clone());
                    if (lessonScopedKey) {
                      await cache.put(lessonScopedKey, fetched.clone());
                    }
                    response = fetched;
                  }
                }

                if (response) {
                  const arrayBuffer = await response.arrayBuffer();
                  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                  const objectUrl = URL.createObjectURL(blob);
                  cacheBlobUrlRef.current = objectUrl;
                  setMediaUrl(objectUrl);
                  return;
                }
              } catch {
                // Fall through to direct URL fallback.
              }
            }

            setMediaUrl(selectedImage.url);
            return;
          }

          // Office documents need a public URL for Office Online embed.
          if (isOfficeDoc) {
            setMediaUrl(selectedImage.url);
            return;
          }

          if (isImage || isVideo) {
            const idbUrl = await getImage(selectedImage.id);
            if (idbUrl) {
              setMediaUrl(idbUrl);
              return;
            }
          }

          if (typeof window !== "undefined" && "caches" in window) {
            const cache = await caches.open(LESSON_MEDIA_CACHE);
            const lessonId = getActiveLessonId();
            const lessonScopedKey = lessonId ? buildLessonScopedCacheKey(lessonId, selectedImage.url) : null;
            let response = await cache.match(selectedImage.url);
            if (!response && lessonScopedKey) {
              response = await cache.match(lessonScopedKey);
            }

            if (!response) {
              const fetched = await fetchMediaWithAuthFallback(selectedImage.url);
              if (fetched.ok) {
                await cache.put(selectedImage.url, fetched.clone());
                if (lessonScopedKey) {
                  await cache.put(lessonScopedKey, fetched.clone());
                }
                response = fetched;
              }
            }

            if (response) {
              const blob = await response.blob();
              const objectUrl = URL.createObjectURL(blob);
              cacheBlobUrlRef.current = objectUrl;
              setMediaUrl(objectUrl);
              return;
            }
          }

          // Last resort fallback to source URL.
          setMediaUrl(selectedImage.url);
        } catch (error) {
          console.error("Failed to load media", error);
          setMediaUrl(selectedImage.url || null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setMediaUrl(null);
      }

      setIsVideoEventReady(false);
    };

    if (cacheBlobUrlRef.current) {
      URL.revokeObjectURL(cacheBlobUrlRef.current);
      cacheBlobUrlRef.current = null;
    }

    loadMedia();
  }, [selectedImage, isOfficeDoc]);

  useEffect(() => {
    if (selectedImage?.type !== 'video') return;
    const id = setTimeout(() => setIsVideoEventReady(true), 250);
    return () => clearTimeout(id);
  }, [selectedImage?.id, selectedImage?.type]);

  useEffect(() => {
    return () => {
      if (cacheBlobUrlRef.current) {
        URL.revokeObjectURL(cacheBlobUrlRef.current);
        cacheBlobUrlRef.current = null;
      }
    };
  }, []);

  if (!selectedImage?.id) return null;

  if (isLoading) {
    return (
      <div className={`pointer-events-none absolute inset-0 z-40 flex justify-center p-2 sm:p-4 ${isPdf ? 'items-start' : 'items-center'}`}>
        <div className={`pointer-events-auto bg-white rounded-lg shadow-lg p-4 ${frameSize} flex items-center justify-center border border-gray-200`}>
          <p className="text-gray-500">Loading media...</p>
        </div>
      </div>
    );
  }

  console.log('mediaUrl', mediaUrl)
  console.log('i am here doing nothing')

  return (
    <div className={`pointer-events-none absolute inset-0 z-40 flex justify-center p-2 sm:p-4 ${isPdf ? 'items-start' : 'items-center'}`}>
      <div className={`pointer-events-auto bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 flex flex-col ${frameSize}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 flex items-center justify-between shrink-0">
          <h3 className="text-white font-semibold truncate text-sm flex-1">{selectedImage.name}</h3>
          <button
            className="text-white hover:bg-white/20 rounded p-1 transition-colors"
            onClick={() => {
              if (selectedImage?.id) {
                sendMediaHide(selectedImage.id, timerDisplay, getRecordingElapsedMs(timerElapsedSeconds, sessionIdRef));
              }
              dispatch(clearSelectedImage());
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 bg-gray-50 relative ${isPdf ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          {isPdf && mediaUrl ? (
            <div className="h-full w-full bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <p className="text-xs text-slate-500">PDF document</p>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Open in new tab
                </a>
              </div>
              <div className="h-[calc(100%-37px)] w-full">
                <PdfScrollViewer
                  fileUrl={mediaUrl}
                  mode="live"
                  preferIframe={false}
                  className="bg-white"
                />
              </div>
            </div>
          ) : isOfficeDoc && officeViewerUrl ? (
            <iframe
              src={officeViewerUrl}
              title={selectedImage.name}
              className="w-full h-full border-0"
            />
          ) : isImage && mediaUrl ? (
            <img
              src={mediaUrl}
              alt={selectedImage.name}
              className="w-full h-full object-cover lg:object-contain"
            />
          ) : isVideo && mediaUrl ? (
            <video
              src={mediaUrl}
              controls
              onPlay={() => {
                if (!selectedImage?.id || !isVideoEventReady) return;
                sendMediaPlayback(selectedImage.id, 'play', timerDisplay, getRecordingElapsedMs(timerElapsedSeconds, sessionIdRef));
              }}
              onPause={() => {
                if (!selectedImage?.id || !isVideoEventReady) return;
                sendMediaPlayback(selectedImage.id, 'pause', timerDisplay, getRecordingElapsedMs(timerElapsedSeconds, sessionIdRef));
              }}
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <p>Unable to display {selectedImage.type}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaFrame;
