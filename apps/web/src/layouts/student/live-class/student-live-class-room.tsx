import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { Button } from "@bluethub/ui-kit";
import {
  ArrowLeft,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Video,
  Wifi,
  WifiOff,
  Volume2,
} from "lucide-react";
import { liveClassService, type LiveClassDto, type LiveClassJoinResponse } from "@/services/live-class";
import { useAuthContext } from "@/contexts/auth-context";
import { useLiveBoardHub } from "@/hooks/useLiveBoardHub";
import { useLiveClassAudio } from "@/hooks/useLiveClassAudio";
import LiveBoard from "@/component/live-class/live-board";
import LiveStudentBoard from "@/component/live-class/live-student-board";
import CountdownBanner from "@/component/live-class/countdown-banner";
import LessonMediaPanel from "@/component/live-class/lesson-media-panel";
import { getErrorMessage } from "@/utils/errors";
import { withTimeout } from "@/utils/with-timeout";
import {
  setLiveClass,
  setJoinResponse,
  setSharedStudentId,
  setEnded,
  resetLiveClassRuntime,
} from "@/store/live-class-slice";
import type { BoardSnapshot } from "@/services/live-board-hub";

type RoomStatus = "resolving" | "none" | "priming" | "joining" | "ready" | "ended" | "error";
type BoardTab = "teacher" | "mine" | "shared";

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

export default function StudentLiveClassRoom() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuthContext();
  const { hub, status: hubStatus } = useLiveBoardHub();
  const audio = useLiveClassAudio();

  const [status, setStatus] = useState<RoomStatus>("resolving");
  const [pendingClass, setPendingClass] = useState<LiveClassDto | null>(null);
  const [liveClass, setLiveClassState] = useState<LiveClassDto | null>(null);
  const [join, setJoin] = useState<LiveClassJoinResponse | null>(null);
  const [boardSnapshot, setBoardSnapshot] = useState<BoardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BoardTab>("teacher");
  const [sharedStudentId, setSharedStudentIdState] = useState<string | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);
  const [micEnabled, setMicEnabledUi] = useState(false);
  const joiningRef = useRef(false);

  // Memoized against the fixed `join.serverTime`/`liveClass.startedAt`
  // rather than recomputed from `Date.now()` on every re-render of this
  // (frequently re-rendering) room — see the identical note in the
  // teacher's room for why a plain recompute silently freezes instead of
  // tracking real elapsed time.
  const serverOffsetMs = useMemo(
    () => (join ? new Date(join.serverTime).getTime() - Date.now() : 0),
    [join?.serverTime]
  );
  const startedAtMs = useMemo(
    () => (liveClass?.startedAt ? new Date(liveClass.startedAt).getTime() : Date.now()),
    [liveClass?.startedAt]
  );

  const resolveActiveClass = useCallback(async () => {
    try {
      const res = await liveClassService.getMine();
      const classes = res.data.data ?? [];
      const active = classes.find((c) => c.status === "Live") ?? classes.find((c) => c.status === "Scheduled");
      if (!active) {
        setStatus("none");
        return;
      }
      setPendingClass(active);
      setStatus("priming");
    } catch (err) {
      setError(getErrorMessage(err, "Could not check for a live class."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void resolveActiveClass();
  }, [resolveActiveClass]);

  // While waiting for the teacher to start a Scheduled class, poll quietly
  // so the Join button lights up the moment it goes Live — no manual refresh needed.
  useEffect(() => {
    if (status !== "priming" || pendingClass?.status !== "Scheduled") return;
    const interval = setInterval(() => void resolveActiveClass(), 5000);
    return () => clearInterval(interval);
  }, [status, pendingClass?.status, resolveActiveClass]);

  const handleJoin = async () => {
    if (!pendingClass || joiningRef.current) return;
    if (pendingClass.status !== "Live") {
      toast.error("Your teacher hasn't started the class yet.");
      return;
    }
    joiningRef.current = true;
    setStatus("joining");
    setError(null);

    try {
      const joinRes = await liveClassService.join(pendingClass.id);
      const joinData = joinRes.data.data;
      setJoin(joinData);
      setLiveClassState(pendingClass);
      dispatch(setJoinResponse(joinData));
      dispatch(setLiveClass(pendingClass));
      setCanSpeak(joinData.canSpeak);

      const snapshot = await withTimeout(hub.connect(pendingClass.id), 15000, "Connecting to the live board");
      setBoardSnapshot(snapshot);
      setSharedStudentIdState(snapshot.sharedStudentId);

      await withTimeout(
        audio.connect(joinData.audio.url, joinData.audio.token, joinData.canSpeak),
        15000,
        "Connecting to the audio room"
      );
      await audio.startAudio(); // user-gesture context from the Join click

      setStatus("ready");
    } catch (err) {
      setError(getErrorMessage(err, "Could not join the live class."));
      setStatus("error");
      joiningRef.current = false;
    }
  };

  const handleClassEnded = useCallback(
    (reason: string) => {
      setEndReason(reason);
      dispatch(setEnded({ reason }));
      setStatus("ended");
    },
    [dispatch]
  );

  useEffect(() => {
    if (status !== "ready" && status !== "joining") return;
    const unsubShared = hub.on("BoardShared", ({ studentId }) => {
      setSharedStudentIdState(studentId);
      dispatch(setSharedStudentId(studentId));
      if (studentId === null && activeTab === "shared") setActiveTab("teacher");
    });
    const unsubSpeak = hub.on("SpeakChanged", ({ studentId, canSpeak: allow }) => {
      if (studentId === user?.id) {
        setCanSpeak(allow);
        audio.applySpeakHint(allow);
        if (allow) toast.success("Your teacher let you speak!");
      }
    });
    const unsubWarning = hub.on("Warning", ({ minutesLeft }) => {
      toast(`${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left in this class.`, { icon: "⏰" });
    });
    const unsubEnded = hub.on("ClassEnded", ({ reason }) => handleClassEnded(reason));

    return () => {
      unsubShared();
      unsubSpeak();
      unsubWarning();
      unsubEnded();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub, status, user?.id, activeTab, handleClassEnded]);

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

  const handleToggleMic = async () => {
    const next = !micEnabled;
    await audio.setMicEnabled(next);
    setMicEnabledUi(next && audio.canPublishMic);
  };

  // ── Resolving / none / priming / joining / error states ──────────────────

  if (status === "resolving") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-slate-100 font-poppins">
        <Loader2 className="size-8 animate-spin text-chestnut" />
        <p className="text-sm text-slate-500">Checking for a live class...</p>
      </div>
    );
  }

  if (status === "none") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center font-poppins">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
          <Video className="size-7 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700">No live class right now</p>
        <p className="max-w-sm text-xs text-slate-400">
          When your teacher starts a live class, it'll show up here and on your dashboard.
        </p>
        <Button onClick={() => navigate("/student")}>
          <ArrowLeft className="mr-1.5 size-4" /> Back to dashboard
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center font-poppins">
        <p className="text-sm text-slate-600">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void resolveActiveClass()}>
            <RefreshCw className="mr-1.5 size-4" /> Try again
          </Button>
          <Button onClick={() => navigate("/student")}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center font-poppins">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <Video className="size-7 text-emerald-500" />
        </div>
        <p className="text-sm font-medium text-slate-700">
          Class ended{endReason === "TimeUp" ? " — time's up!" : "."}
        </p>
        <p className="max-w-sm text-xs text-slate-400">
          Nice work today. The replay will appear once your teacher publishes the lesson.
        </p>
        <Button onClick={() => navigate("/student")}>Back to dashboard</Button>
      </div>
    );
  }

  if (status === "priming" && pendingClass) {
    const isLive = pendingClass.status === "Live";
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-slate-100 p-6 text-center font-poppins">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-chestnut/10">
          <Video className="size-7 text-chestnut" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800">
            {pendingClass.title || `${pendingClass.subjectName} class`}
          </p>
          <p className="mt-1 text-xs text-slate-400">with {pendingClass.teacherName}</p>
        </div>

        {isLive ? (
          <p className="text-sm text-emerald-600">Your teacher is ready — join whenever you are!</p>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-amber-600">
            <Loader2 className="size-3.5 animate-spin" /> Waiting for your teacher to start...
          </p>
        )}

        <div className="flex max-w-xs items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-xs text-slate-500">
          <Headphones className="size-4 shrink-0 text-slate-400" />
          Use headphones if you can — it helps everyone hear each other clearly.
        </div>

        <Button onClick={handleJoin} disabled={!isLive} className="gap-2 bg-chestnut text-white hover:bg-chestnut/90">
          <Video className="size-4" />
          Join class
        </Button>
      </div>
    );
  }

  if (status === "joining" || !liveClass || !join) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-slate-100 font-poppins">
        <Loader2 className="size-8 animate-spin text-chestnut" />
        <p className="text-sm text-slate-500">Joining the class...</p>
      </div>
    );
  }

  // ── Ready — the actual room ───────────────────────────────────────────────

  const hasSharedBoard = !!sharedStudentId && sharedStudentId !== user?.id;

  return (
    <div className="flex h-dvh flex-col bg-slate-100 font-poppins">
      <div className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{liveClass.title || "Live class"}</p>
          <p className="truncate text-xs text-slate-400">with {liveClass.teacherName}</p>
        </div>
        <ConnectionPill ok={hubStatus === "connected"} label="Board" />
        <ConnectionPill ok={audio.status === "connected"} label="Audio" />
        <LessonMediaPanel
          lessonId={liveClass.lessonId}
          teacherId={liveClass.teacherId}
          mediaChannel={audio}
        />
        {audio.activeSpeakerIds.size > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600">
            <Volume2 className="size-3" /> Someone's talking
          </span>
        )}
        <CountdownBanner endsAt={join.endsAt} serverOffsetMs={serverOffsetMs} />
      </div>

      <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
        <button
          onClick={() => setActiveTab("teacher")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "teacher" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Teacher's board
        </button>
        <button
          onClick={() => setActiveTab("mine")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "mine" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          My board
        </button>
        {hasSharedBoard && (
          <button
            onClick={() => setActiveTab("shared")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "shared" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Shared board
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!canSpeak ? (
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
              <MicOff className="size-3.5" /> Waiting for your teacher to let you speak
            </span>
          ) : (
            <button
              onClick={handleToggleMic}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                micEnabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {micEnabled ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
              {micEnabled ? "You can speak" : "Tap to speak"}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3">
        {/* Kept mounted (just hidden) across tab switches rather than conditionally
            rendered in/out — each board owns its own live stroke cache and "current
            board" state fed by the data channel/hub in real time, so unmounting on
            every tab switch would reset it back to the stale join-time snapshot and
            silently miss whatever the teacher did while the student was on another tab. */}
        <div className={activeTab === "teacher" ? "h-full" : "hidden"}>
          <LiveBoard
            hub={hub}
            canDraw={false}
            initialSnapshot={boardSnapshot}
            className="h-full"
            dataChannel={audio}
            teacherId={liveClass.teacherId}
            startedAtMs={startedAtMs}
            serverOffsetMs={serverOffsetMs}
          />
        </div>
        {user && (
          <div className={activeTab === "mine" ? "h-full" : "hidden"}>
            <LiveStudentBoard
              hub={hub}
              studentId={user.id}
              canDraw
              isOwnBoard
              initialSnapshot={boardSnapshot?.myBoard ?? null}
              className="h-full"
            />
          </div>
        )}
        {hasSharedBoard && sharedStudentId && (
          <div className={activeTab === "shared" ? "h-full" : "hidden"}>
            <LiveStudentBoard
              hub={hub}
              studentId={sharedStudentId}
              canDraw={false}
              isOwnBoard={false}
              viewOnlyLabel="Shared by your teacher"
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
