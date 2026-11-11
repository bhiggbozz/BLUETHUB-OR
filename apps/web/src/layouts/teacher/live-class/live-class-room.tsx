import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  Button,
} from "@bluethub/ui-kit";
import { ArrowLeft, Loader2, LogOut, Mic, MicOff, Wifi, WifiOff } from "lucide-react";
import { liveClassService, type LiveClassDto, type LiveClassJoinResponse } from "@/services/live-class";
import { useLiveBoardHub } from "@/hooks/useLiveBoardHub";
import { useLiveClassAudio } from "@/hooks/useLiveClassAudio";
import { useLiveClassRecorder, fetchLiveClassLessonMeta } from "@/hooks/useLiveClassRecorder";
import LiveBoard from "@/component/live-class/live-board";
import LiveStudentBoard from "@/component/live-class/live-student-board";
import SpeakToggle from "@/component/live-class/speak-toggle";
import CountdownBanner from "@/component/live-class/countdown-banner";
import LessonMediaPanel from "@/component/live-class/lesson-media-panel";
import { getErrorMessage } from "@/utils/errors";
import { withTimeout } from "@/utils/with-timeout";
import {
  setLiveClass,
  setJoinResponse,
  setSharedStudentId,
  setCanSpeak,
  setEnded,
  resetLiveClassRuntime,
} from "@/store/live-class-slice";
import type { BoardSnapshot } from "@/services/live-board-hub";

type RoomStatus = "joining" | "ready" | "error";

const ConnectionPill = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
      ok ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"
    }`}
  >
    {ok ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
    {label}
  </span>
);

export default function TeacherLiveClassRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { hub, status: hubStatus } = useLiveBoardHub();
  const audio = useLiveClassAudio();
  const recorder = useLiveClassRecorder();
  const lessonMetaRef = useRef<Awaited<ReturnType<typeof fetchLiveClassLessonMeta>> | null>(null);

  const [liveClass, setLiveClassState] = useState<LiveClassDto | null>(null);
  const [join, setJoin] = useState<LiveClassJoinResponse | null>(null);
  const [boardSnapshot, setBoardSnapshot] = useState<BoardSnapshot | null>(null);
  const [status, setStatus] = useState<RoomStatus>("joining");
  const [joinError, setJoinError] = useState<string | null>(null);

  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  const [sharedStudentId, setSharedStudentIdState] = useState<string | null>(null);
  const [canSpeakMap, setCanSpeakMap] = useState<Record<string, boolean>>({});
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  // Memoized against `join.serverTime`/`liveClass.startedAt` specifically —
  // both are fixed once set, but this component re-renders often (speaker
  // changes, canSpeak updates, hub events), and recomputing `Date.now() -
  // <fixed timestamp>` fresh on every one of those re-renders would freeze
  // the result near whatever it was at the render closest to join, not
  // actually track elapsed time. Every outgoing stroke's `ts` is stamped
  // from this, so a frozen offset silently breaks the student's playout
  // scheduling the longer the class runs.
  const serverOffsetMs = useMemo(
    () => (join ? new Date(join.serverTime).getTime() - Date.now() : 0),
    [join?.serverTime]
  );
  const startedAtMs = useMemo(
    () => (liveClass?.startedAt ? new Date(liveClass.startedAt).getTime() : Date.now()),
    [liveClass?.startedAt]
  );

  useEffect(() => {
    if (!id) return;
    // No "has run" ref guard here on purpose — under StrictMode's dev-only
    // double-invoke (mount → cleanup → mount), a ref like that blocks the
    // second, surviving invocation from ever running while the first one's
    // `cancelled` flag flips true almost immediately, so the join silently
    // aborts partway through and the room hangs on "Joining..." forever with
    // no error. `cancelled` below is the correct, sufficient guard against
    // stale results — it's fine for /join and /getById to fire twice in dev.
    let cancelled = false;

    (async () => {
      try {
        const [joinRes, classRes] = await Promise.all([
          liveClassService.join(id),
          liveClassService.getById(id),
        ]);
        if (cancelled) return;

        const joinData = joinRes.data.data;
        const classData = classRes.data.data;
        setJoin(joinData);
        setLiveClassState(classData);
        dispatch(setJoinResponse(joinData));
        dispatch(setLiveClass(classData));
        setCanSpeakMap(Object.fromEntries(classData.students.map((s) => [s.studentId, s.canSpeak])));
        // Start on the shared teacher board, not some student's — the
        // teacher switches to a student's board deliberately, via the strip.

        const snapshot = await withTimeout(hub.connect(id), 15000, "Connecting to the live board");
        if (cancelled) return;
        setBoardSnapshot(snapshot);
        setSharedStudentIdState(snapshot.sharedStudentId);

        await withTimeout(
          audio.connect(joinData.audio.url, joinData.audio.token, joinData.canSpeak),
          15000,
          "Connecting to the audio room"
        );
        if (cancelled) return;

        // The teacher always speaks (per the live-class brief) — publish
        // the mic by default instead of leaving them silent until they find
        // a mute button. startAudio() also unlocks playback so the teacher
        // can actually hear a student once permitted to speak.
        await audio.startAudio();
        await audio.setMicEnabled(true);
        if (cancelled) return;

        // Recording is a separate, isolated concern from the live hub/audio
        // connections above — a failure here should never block the class
        // itself from starting, just mean no replay afterwards.
        try {
          lessonMetaRef.current = await fetchLiveClassLessonMeta(classData.lessonId);
        } catch {
          lessonMetaRef.current = {
            classroomId: classData.classroomId,
            classroomName: classData.classroomName,
            subjectId: classData.subjectId,
            subjectName: classData.subjectName,
            topicName: "",
            subTopic: classData.title ?? "",
            aim: "",
          };
        }
        if (cancelled) return;
        void recorder.start({
          sessionId: joinData.boardSessionId,
          lessonId: classData.lessonId,
          teacherId: classData.teacherId,
          teacherName: classData.teacherName,
          initialBoard: snapshot.currentBoard,
        });

        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setJoinError(getErrorMessage(err, "Could not join the live class."));
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fallbackLessonMeta = useCallback(
    () =>
      lessonMetaRef.current ?? {
        classroomId: liveClass?.classroomId ?? "",
        classroomName: liveClass?.classroomName ?? "",
        subjectId: liveClass?.subjectId ?? "",
        subjectName: liveClass?.subjectName ?? "",
        topicName: "",
        subTopic: liveClass?.title ?? "",
        aim: "",
      },
    [liveClass]
  );

  const handleClassEnded = useCallback(
    async (reason: string) => {
      dispatch(setEnded({ reason }));
      const recordingSaved = await recorder.finalize(fallbackLessonMeta());
      navigate(`/teacher/live-class/${id}/end`, { state: { liveClass, endReason: reason, recordingSaved } });
    },
    [dispatch, navigate, id, liveClass, recorder, fallbackLessonMeta]
  );

  useEffect(() => {
    const unsubShared = hub.on("BoardShared", ({ studentId }) => {
      setSharedStudentIdState(studentId);
      dispatch(setSharedStudentId(studentId));
    });
    const unsubSpeak = hub.on("SpeakChanged", ({ studentId, canSpeak: allow }) => {
      setCanSpeakMap((prev) => ({ ...prev, [studentId]: allow }));
      dispatch(setCanSpeak({ studentId, canSpeak: allow }));
    });
    const unsubWarning = hub.on("Warning", ({ minutesLeft }) => {
      toast(`${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left in this class.`, { icon: "⏰" });
    });
    const unsubPresence = hub.on("Presence", ({ role, joined }) => {
      if (role === "Student") toast(joined ? "A student joined." : "A student left.", { icon: joined ? "👋" : "👋" });
    });
    const unsubEnded = hub.on("ClassEnded", ({ reason }) => handleClassEnded(reason));

    return () => {
      unsubShared();
      unsubSpeak();
      unsubWarning();
      unsubPresence();
      unsubEnded();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub, handleClassEnded]);

  // Warn before an accidental tab close/refresh while the class is live —
  // mirrors the existing recorder's EndClass guard.
  useEffect(() => {
    if (status !== "ready") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  useEffect(() => {
    return () => {
      dispatch(resetLiveClassRuntime());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleShare = (studentId: string) => {
    const next = sharedStudentId === studentId ? null : studentId;
    setSharedStudentIdState(next);
    void hub.shareStudentBoard(next);
  };

  const handleSetSpeak = async (studentId: string, allow: boolean) => {
    if (!id) return;
    try {
      await liveClassService.setSpeak(id, studentId, allow);
      setCanSpeakMap((prev) => ({ ...prev, [studentId]: allow }));
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update that student's mic permission."));
    }
  };

  const handleConfirmEnd = async () => {
    if (!id) return;
    setEnding(true);
    const recordingSaved = await recorder.finalize(fallbackLessonMeta());
    try {
      const res = await liveClassService.end(id);
      navigate(`/teacher/live-class/${id}/end`, { state: { liveClass: res.data.data, recordingSaved } });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not end the class."));
      setEnding(false);
      setEndDialogOpen(false);
    }
  };

  if (status === "joining") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-slate-100 font-poppins">
        <Loader2 className="size-8 animate-spin text-chestnut" />
        <p className="text-sm text-slate-500">Joining the live class…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center font-poppins">
        <p className="text-sm text-slate-600">{joinError}</p>
        <Button onClick={() => navigate("/teacher/live-class")}>
          <ArrowLeft className="mr-1.5 size-4" /> Back to Live Classes
        </Button>
      </div>
    );
  }

  if (!liveClass || !join) return null;

  return (
    <div className="flex h-dvh flex-col bg-slate-100 font-poppins">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{liveClass.title || "Live class"}</p>
          <p className="truncate text-xs text-slate-400">
            {liveClass.subjectName} · {liveClass.classroomName}
          </p>
        </div>
        <ConnectionPill ok={hubStatus === "connected"} label="Board" />
        <ConnectionPill ok={audio.status === "connected"} label="Audio" />
        <LessonMediaPanel
          lessonId={liveClass.lessonId}
          isTeacher
          teacherId={liveClass.teacherId}
          mediaChannel={audio}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void audio.setMicEnabled(!audio.micEnabled)}
          className={`gap-1.5 ${audio.micEnabled ? "" : "border-red-300 text-red-600 hover:bg-red-50"}`}
          title={audio.micEnabled ? "Mute your mic" : "Unmute your mic"}
        >
          {audio.micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </Button>
        <CountdownBanner endsAt={join.endsAt} serverOffsetMs={serverOffsetMs} onEnded={() => {}} />
        <Button variant="destructive" size="sm" onClick={() => setEndDialogOpen(true)} className="gap-1.5">
          <LogOut className="size-4" /> End class
        </Button>
      </div>

      {/* Student strip — kept compact so the main board below gets close to
          as much height as the student's own full-size board view. */}
      <div className="flex items-center gap-2.5 overflow-x-auto border-b bg-white px-4 py-1.5">
        {liveClass.students.map((student) => (
          <div key={student.studentId} className="flex shrink-0 flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFocusedStudentId(student.studentId)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  focusedStudentId === student.studentId
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {student.name}
              </button>
              <SpeakToggle
                name={student.name}
                canSpeak={canSpeakMap[student.studentId] ?? student.canSpeak}
                isSpeaking={audio.activeSpeakerIds.has(student.studentId)}
                onToggle={(allow) => handleSetSpeak(student.studentId, allow)}
              />
            </div>
            {focusedStudentId !== student.studentId && (
              <div className="h-12 w-20 overflow-hidden rounded-lg border border-slate-200">
                <LiveStudentBoard
                  hub={hub}
                  studentId={student.studentId}
                  canDraw={false}
                  isOwnBoard={false}
                  className="h-full"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main board */}
      <div className="min-h-0 flex-1 p-3">
        {focusedStudentId ? (
          <div className="flex h-full flex-col gap-2">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setFocusedStudentId(null)} className="gap-1.5">
                <ArrowLeft className="size-4" /> Shared board
              </Button>
              <Button
                size="sm"
                variant={sharedStudentId === focusedStudentId ? "default" : "outline"}
                onClick={() => handleToggleShare(focusedStudentId)}
              >
                {sharedStudentId === focusedStudentId ? "Stop showing to class" : "Show to class"}
              </Button>
            </div>
            <LiveStudentBoard
              key={focusedStudentId}
              hub={hub}
              studentId={focusedStudentId}
              canDraw
              isOwnBoard={false}
              className="flex-1"
            />
          </div>
        ) : (
          <LiveBoard
            hub={hub}
            canDraw
            initialSnapshot={boardSnapshot}
            className="h-full"
            onLocalSegment={recorder.recordStroke}
            onLocalBoardSwitch={recorder.recordBoardSwitch}
            dataChannel={audio}
            teacherId={liveClass.teacherId}
            startedAtMs={startedAtMs}
            serverOffsetMs={serverOffsetMs}
          />
        )}
      </div>

      <AlertDialog open={endDialogOpen} onOpenChange={(open) => !ending && setEndDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this live class?</AlertDialogTitle>
            <AlertDialogDescription>
              Every student will be disconnected immediately. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ending}>Keep going</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={ending} onClick={handleConfirmEnd}>
              {ending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {ending ? (recorder.isFinalizing ? "Saving recording…" : "Ending…") : "End class"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
