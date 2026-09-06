import { Provider } from "react-redux";
import { store } from "@/store/index";
import Class from "@/pages/teacher/note-board/class";
import AppBar from "./component/app-bar";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "@/contexts/session-context";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetClassRuntime } from "@/store/class-action-slice";
import { forceResetGlobalTimer } from "@/hooks/useGlobalTimer";
import { getInterruptedSessions, cleanupEntireSession } from "@/utils/db";
import type { LocalSession } from "@/utils/constant";
import SessionRecoveryDialog from "@/component/session-recovery-dialog";
import { deleteImage } from "@/services/class-media";
import { LESSON_MEDIA_CACHE, buildLessonScopedCacheKey } from "@/utils/lesson-media-cache";

// Inner component that has access to Redux dispatch
const ClassRoomInner = () => {
  const navigate = useNavigate();
  const [recoverySession, setRecoverySession] = useState<LocalSession | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkForRecovery = async () => {
      // Check if we're continuing from a saved draft (manual continue flow)
      const continueSessionId = localStorage.getItem('continueSessionId');

      if (continueSessionId) {
        // Manual continue flow - let class.tsx handle it
        setIsReady(true);
        return;
      }

      // Check for interrupted sessions — only for the current lesson
      try {
        const currentLessonId = (() => {
          try {
            const raw = sessionStorage.getItem('activeLesson');
            return raw ? JSON.parse(raw)?.lesson?.id : null;
          } catch { return null; }
        })();

        const interruptedSessions = await getInterruptedSessions();

        if (interruptedSessions.length > 0) {
          // If we know the active lesson, discard interrupted sessions from other lessons.
          // If active lesson is missing (deep-link/open board directly), never discard.
          if (currentLessonId) {
            const otherLessons = interruptedSessions.filter(
              s => s.lessonId !== currentLessonId
            );
            await Promise.allSettled(otherLessons.map(s => cleanupEntireSession(s.id)));
          }

          // Prefer same-lesson recovery when available; otherwise fall back to all sessions.
          const sameLesson = currentLessonId
            ? interruptedSessions.filter(s => s.lessonId === currentLessonId)
            : interruptedSessions;

          if (sameLesson.length > 0) {
            const mostRecent = sameLesson.sort(
              (a, b) => new Date(b.recording.startedAt).getTime() - new Date(a.recording.startedAt).getTime()
            )[0];
            setRecoverySession(mostRecent);
            setShowRecoveryDialog(true);
            return;
          }
        }
      } catch (err) {
        console.error('[ClassRoom] Failed to check for interrupted sessions:', err);
      }

      // No recovery needed - reset and start fresh
      forceResetGlobalTimer();
      store.dispatch(resetClassRuntime());
      setIsReady(true);
    };

    checkForRecovery();
  }, []);

  const handleContinueSession = () => {
    if (!recoverySession) return;

    console.log('[ClassRoom] User chose to continue session:', recoverySession.id);

    // Set up for continuation via the existing flow
    localStorage.setItem('continueSessionId', recoverySession.id);
    localStorage.setItem('continueLessonId', recoverySession.lessonId);

    // Also restore activeLesson for the topic display
    const activeLesson = {
      lesson: {
        id: recoverySession.lessonId,
        topic: recoverySession.lesson.topic,
        subTopic: recoverySession.lesson.subTopic,
        aim: recoverySession.lesson.aim,
        subject: {
          name: recoverySession.lesson.subjectName,
        },
        classroom: {
          name: recoverySession.lesson.className,
        },
      },
      startedAt: recoverySession.recording.startedAt,
    };
    sessionStorage.setItem('activeLesson', JSON.stringify(activeLesson));

    setShowRecoveryDialog(false);
    setIsReady(true);
  };

  const handleDiscardSession = async () => {
    if (!recoverySession) return;

    console.log('[ClassRoom] User chose to discard session:', recoverySession.id);

    try {
      // Clean up the interrupted session
      await cleanupEntireSession(recoverySession.id);

      // Remove lesson media cached in image-store by known media event IDs
      const mediaIds = Array.from(new Set(
        (recoverySession.mediaEvents ?? [])
          .map((m) => m.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      ));
      await Promise.allSettled(mediaIds.map((id) => deleteImage(id)));

      // Remove lesson media URLs from Cache API (lesson-specific only)
      const cacheUrls = new Set<string>();
      for (const media of recoverySession.mediaEvents ?? []) {
        if (media?.url) cacheUrls.add(media.url);
      }

      try {
        const activeLessonRaw = sessionStorage.getItem('activeLesson');
        if (activeLessonRaw) {
          const activeLesson = JSON.parse(activeLessonRaw) as {
            lesson?: { id?: string };
            media?: Array<{ cloudinaryUrl?: string }>;
          };

          if (activeLesson.lesson?.id === recoverySession.lessonId) {
            for (const media of activeLesson.media ?? []) {
              if (media.cloudinaryUrl) cacheUrls.add(media.cloudinaryUrl);
            }
          }
        }
      } catch {
        // Best-effort cache cleanup only.
      }

      if (typeof window !== 'undefined' && 'caches' in window && cacheUrls.size > 0) {
        const cache = await caches.open(LESSON_MEDIA_CACHE);
        const urls = Array.from(cacheUrls);
        await Promise.allSettled(urls.map((url) => cache.delete(url)));
        await Promise.allSettled(
          urls.map((url) => cache.delete(buildLessonScopedCacheKey(recoverySession.lessonId, url)))
        );
      }

      // Clear local board replay/session artifacts for this session lifecycle
      localStorage.removeItem('continueSessionId');
      localStorage.removeItem('continueLessonId');
      localStorage.removeItem('currentBatches');
      localStorage.removeItem('recordingStartTimerMs');
      localStorage.removeItem('recordingStartSessionId');
      localStorage.removeItem('sessionStartWallMs');
      localStorage.removeItem('sessionStartSessionId');
      localStorage.removeItem('totalPausedMs');

      try {
        const activeLessonRaw = sessionStorage.getItem('activeLesson');
        if (activeLessonRaw) {
          const activeLesson = JSON.parse(activeLessonRaw) as { lesson?: { id?: string } };
          if (activeLesson.lesson?.id === recoverySession.lessonId) {
            sessionStorage.removeItem('activeLesson');
          }
        }
      } catch {
        sessionStorage.removeItem('activeLesson');
      }
    } catch (err) {
      console.error('[ClassRoom] Failed to cleanup session:', err);
    }

    // Reset and start fresh
    forceResetGlobalTimer();
    store.dispatch(resetClassRuntime());

    setShowRecoveryDialog(false);
    setRecoverySession(null);
    setIsReady(true);

    // Exit board after discard to avoid continuing in a deleted session context.
    // A non-teacher caller stores its own exit destination before entering the
    // board (see end-class.tsx's getExitPath) — falls back to /teacher so the
    // existing teacher flow is unchanged.
    navigate(sessionStorage.getItem('boardExitPath') || '/teacher', { replace: true });
  };

  return (
    <>
      <SessionProvider>
        <Toaster position="bottom-center" />

        {/* Recovery Dialog */}
        <SessionRecoveryDialog
          open={showRecoveryDialog}
          session={recoverySession}
          onContinue={handleContinueSession}
          onDiscard={handleDiscardSession}
        />

        {/* Only render the board when ready */}
        {isReady && (
          <>
            <AppBar />
            <div>
              <Class />
            </div>
          </>
        )}
      </SessionProvider>
    </>
  );
};

const ClassRoom = () => {
  return (
    <div className="">
      <Provider store={store}>
        <ClassRoomInner />
      </Provider>
    </div>
  );
};

export default ClassRoom;