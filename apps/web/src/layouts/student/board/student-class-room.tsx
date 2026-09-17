import { Provider } from "react-redux";
import { store } from "@/store/index";
import Class from "@/pages/teacher/note-board/class";
import StudentAppBar from "./component/student-app-bar";
import StudentClassBottom from "./component/student-class-bottom";
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

/**
 * Dedicated board shell for a student's study-group recording — a fork of
 * layouts/teacher/class/class-room.tsx rather than the same component reused
 * with sessionStorage flags. The canvas/toolbar/recording engine (Class,
 * SessionProvider) has no teacher-vs-student behavior difference so it stays
 * shared; what's forked here is the outer chrome (StudentAppBar, which wires
 * to StudentEndClass and its own group-content upload path) and the exit
 * destination on session recovery/discard, which points back into the
 * student's study-group flow instead of /teacher.
 */
const StudentClassRoomInner = () => {
  const navigate = useNavigate();
  const [recoverySession, setRecoverySession] = useState<LocalSession | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkForRecovery = async () => {
      const continueSessionId = localStorage.getItem('continueSessionId');

      if (continueSessionId) {
        setIsReady(true);
        return;
      }

      try {
        const currentLessonId = (() => {
          try {
            const raw = sessionStorage.getItem('activeLesson');
            return raw ? JSON.parse(raw)?.lesson?.id : null;
          } catch { return null; }
        })();

        const interruptedSessions = await getInterruptedSessions();

        if (interruptedSessions.length > 0) {
          if (currentLessonId) {
            const otherLessons = interruptedSessions.filter(
              s => s.lessonId !== currentLessonId
            );
            await Promise.allSettled(otherLessons.map(s => cleanupEntireSession(s.id)));
          }

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
        console.error('[StudentClassRoom] Failed to check for interrupted sessions:', err);
      }

      forceResetGlobalTimer();
      store.dispatch(resetClassRuntime());
      setIsReady(true);
    };

    checkForRecovery();
  }, []);

  const handleContinueSession = () => {
    if (!recoverySession) return;

    localStorage.setItem('continueSessionId', recoverySession.id);
    localStorage.setItem('continueLessonId', recoverySession.lessonId);

    const activeLesson = {
      lesson: {
        id: recoverySession.lessonId,
        topic: recoverySession.lesson.topic,
        subTopic: recoverySession.lesson.subTopic,
        aim: recoverySession.lesson.aim,
        subject: { name: recoverySession.lesson.subjectName },
        classroom: { name: recoverySession.lesson.className },
      },
      startedAt: recoverySession.recording.startedAt,
    };
    sessionStorage.setItem('activeLesson', JSON.stringify(activeLesson));

    setShowRecoveryDialog(false);
    setIsReady(true);
  };

  const handleDiscardSession = async () => {
    if (!recoverySession) return;

    try {
      await cleanupEntireSession(recoverySession.id);

      const mediaIds = Array.from(new Set(
        (recoverySession.mediaEvents ?? [])
          .map((m) => m.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      ));
      await Promise.allSettled(mediaIds.map((id) => deleteImage(id)));

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
      console.error('[StudentClassRoom] Failed to cleanup session:', err);
    }

    forceResetGlobalTimer();
    store.dispatch(resetClassRuntime());

    setShowRecoveryDialog(false);
    setRecoverySession(null);
    setIsReady(true);

    navigate(sessionStorage.getItem('boardExitPath') || '/student/study-groups', { replace: true });
  };

  return (
    <>
      <SessionProvider>
        <Toaster position="bottom-center" />

        <SessionRecoveryDialog
          open={showRecoveryDialog}
          session={recoverySession}
          onContinue={handleContinueSession}
          onDiscard={handleDiscardSession}
        />

        {isReady && (
          <>
            <StudentAppBar />
            <div>
              <Class BottomBar={StudentClassBottom} />
            </div>
          </>
        )}
      </SessionProvider>
    </>
  );
};

const StudentClassRoom = () => {
  return (
    <div className="">
      <Provider store={store}>
        <StudentClassRoomInner />
      </Provider>
    </div>
  );
};

export default StudentClassRoom;
