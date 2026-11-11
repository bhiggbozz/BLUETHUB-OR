import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Video,
  Play,
  Users,
  Loader2,
  RefreshCw,
  AlertCircle,
  Menu,
  Radio,
  Clock,
  X,
  CalendarClock,
  History,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  Button,
  Input,
  Label,
} from "@bluethub/ui-kit";
import { liveClassService, type LiveClassDto } from "@/services/live-class";
import { schoolFeaturesService, LIVE_CLASS_FEATURE_KEY } from "@/services/school-features";
import { getErrorMessage } from "@/utils/errors";
import { formatWAT, serverOffsetMs, secondsUntil, formatCountdown } from "@/utils/live-class-time";

const MIN_DURATION = 5;
const MAX_DURATION = 40;

const TeacherLiveClassIndex = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ openMobileNav?: () => void } | null>();
  const openMobileNav = outletContext?.openMobileNav ?? (() => {});

  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  const [myClasses, setMyClasses] = useState<LiveClassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<LiveClassDto | null>(null);

  // Forces countdowns to re-render every second without a full refetch.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const flag = await schoolFeaturesService.checkFeature(LIVE_CLASS_FEATURE_KEY);
      setFeatureEnabled(flag.data.data.isEnabled);
      if (!flag.data.data.isEnabled) {
        setLoading(false);
        return;
      }

      const classesRes = await liveClassService.getMine();
      setMyClasses(classesRes.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load live classes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Re-poll while anything is still Scheduled, so a countdown reaching zero
  // (or a lesson getting approved) flips canStartNow/visibility without the
  // teacher having to refresh manually.
  const hasScheduled = myClasses.some((c) => c.status === "Scheduled");
  useEffect(() => {
    if (!hasScheduled) return;
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasScheduled]);

  const live = myClasses.filter((c) => c.status === "Live");
  const upcoming = useMemo(
    () =>
      myClasses
        .filter((c) => c.status === "Scheduled")
        .sort((a, b) => new Date(a.scheduledStart ?? a.createdAt).getTime() - new Date(b.scheduledStart ?? b.createdAt).getTime()),
    [myClasses]
  );
  const past = useMemo(
    () =>
      myClasses
        .filter((c) => c.status === "Ended" || c.status === "Cancelled")
        .sort((a, b) => new Date(b.endedAt ?? b.createdAt).getTime() - new Date(a.endedAt ?? a.createdAt).getTime()),
    [myClasses]
  );

  const handleStartScheduled = async (liveClass: LiveClassDto) => {
    setBusyId(liveClass.id);
    try {
      await liveClassService.start(liveClass.id);
      navigate(`/teacher/live-class/room/${liveClass.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not start the live class."));
      setBusyId(null);
    }
  };

  const handleRejoin = (liveClass: LiveClassDto) => {
    navigate(`/teacher/live-class/room/${liveClass.id}`);
  };

  const handleCancel = async (liveClass: LiveClassDto) => {
    setBusyId(liveClass.id);
    try {
      await liveClassService.cancel(liveClass.id);
      toast.success("Live class cancelled.");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not cancel the live class."));
    } finally {
      setBusyId(null);
    }
  };

  if (!loading && featureEnabled === false) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-3 font-poppins">
        <Menu className="w-5 h-5 text-black lg:hidden" onClick={openMobileNav} />
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Video size={28} className="text-gray-400" />
          </div>
          <p className="mb-1 text-lg font-semibold text-gray-700">Live classes aren't switched on yet</p>
          <p className="max-w-sm text-sm text-gray-400">
            Ask your school admin to turn on Live Classes in school settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-3 font-poppins">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Menu className="w-5 h-5 text-black lg:hidden inline" onClick={openMobileNav} />
          <h1 className="ml-3 inline text-sm sm:text-xl font-bold text-gray-900">Live Classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Start a scheduled class, rejoin one that's live, or manage what's coming up.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-chestnut mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <p className="mb-4 text-sm text-gray-600">{error}</p>
          <button onClick={load} className="rounded-xl bg-chestnut px-4 py-2 text-sm font-medium text-white hover:bg-chestnut/90">
            Try Again
          </button>
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <Radio size={14} className="text-red-500" /> Live now
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {live.map((liveClass) => (
                  <div key={liveClass.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                    <div className="h-1.5 bg-red-500" />
                    <div className="p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600">
                          <Radio size={10} /> Live
                        </span>
                      </div>
                      <h3 className="mb-1 line-clamp-2 text-base font-medium text-gray-900">
                        {liveClass.title || `${liveClass.subjectName} class`}
                      </h3>
                      <p className="mb-4 flex items-center gap-1 text-xs text-gray-400">
                        <Users size={12} /> {liveClass.students.length} student{liveClass.students.length === 1 ? "" : "s"} ·{" "}
                        {liveClass.classroomName}
                      </p>
                      <button
                        onClick={() => handleRejoin(liveClass)}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-chestnut to-chestnut/90 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-chestnut/20 transition-all hover:from-chestnut/90 hover:to-chestnut/80"
                      >
                        <Play size={16} /> Rejoin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <CalendarClock size={14} /> Upcoming
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((liveClass) => {
                  const offset = serverOffsetMs(liveClass.serverTime);
                  const waitingApproval = liveClass.lessonStatus === "PendingApproval";
                  const secondsLeft = liveClass.scheduledStart ? secondsUntil(liveClass.scheduledStart, offset) : 0;
                  // The backend's `canStartNow` only refreshes on the 15s poll, so once the
                  // scheduled time has actually passed (checked every second via the ticking
                  // clock), let the button go live immediately rather than waiting on the next
                  // poll. If the backend still rejects the click (e.g. lesson not approved),
                  // handleStartScheduled surfaces that error via toast.
                  const canStart = liveClass.canStartNow || (secondsLeft <= 0 && !waitingApproval);
                  return (
                    <div key={liveClass.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                      <div className="h-1.5 bg-amber-400" />
                      <div className="p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                            <Clock size={10} /> Scheduled
                          </span>
                          <button
                            onClick={() => handleCancel(liveClass)}
                            disabled={busyId === liveClass.id}
                            title="Cancel"
                            className="text-gray-300 hover:text-red-500 disabled:opacity-30"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <h3 className="mb-1 line-clamp-2 text-base font-medium text-gray-900">
                          {liveClass.title || `${liveClass.subjectName} class`}
                        </h3>
                        <p className="mb-2 flex items-center gap-1 text-xs text-gray-400">
                          <Users size={12} /> {liveClass.students.length} student{liveClass.students.length === 1 ? "" : "s"} ·{" "}
                          {liveClass.classroomName}
                        </p>

                        {waitingApproval ? (
                          <p className="mb-4 text-xs font-medium text-amber-700">Waiting for lesson approval</p>
                        ) : (
                          <p className="mb-4 text-xs text-gray-500">
                            {liveClass.scheduledStart && `Starts ${formatWAT(liveClass.scheduledStart)}`}
                            {!liveClass.canStartNow && secondsLeft > 0 && (
                              <span className="ml-1 font-semibold text-gray-700">· in {formatCountdown(secondsLeft)}</span>
                            )}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={busyId === liveClass.id}
                            onClick={() => setRescheduleTarget(liveClass)}
                          >
                            Reschedule
                          </Button>
                          <button
                            onClick={() => handleStartScheduled(liveClass)}
                            disabled={!canStart || busyId === liveClass.id}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-chestnut to-chestnut/90 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-chestnut/20 transition-all hover:from-chestnut/90 hover:to-chestnut/80 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyId === liveClass.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                            Start
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {live.length === 0 && upcoming.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Video size={28} className="text-gray-400" />
              </div>
              <p className="mb-1 text-lg font-semibold text-gray-700">Nothing live or scheduled right now</p>
              <p className="max-w-sm text-sm text-gray-400">
                Submit a lesson, then choose "Schedule a Live Class" to set one up.
              </p>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <History size={14} /> Past
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((liveClass) => {
                  const missed = liveClass.status === "Cancelled" && liveClass.endReason === "Expired";
                  const cancelled = liveClass.status === "Cancelled" && !missed;
                  return (
                    <div key={liveClass.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {liveClass.title || `${liveClass.subjectName} class`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {missed ? "Missed: not started in time" : cancelled ? "Cancelled" : "Ended"}
                        </p>
                      </div>
                      {liveClass.status === "Ended" && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                          Ended
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <RescheduleDialog
        liveClass={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onRescheduled={() => {
          setRescheduleTarget(null);
          void load();
        }}
      />
    </div>
  );
};

function RescheduleDialog({
  liveClass,
  onClose,
  onRescheduled,
}: {
  liveClass: LiveClassDto | null;
  onClose: () => void;
  onRescheduled: () => void;
}) {
  const [scheduledStart, setScheduledStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(MAX_DURATION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (liveClass) {
      setDurationMinutes(liveClass.durationMinutes);
      setScheduledStart("");
      setError(null);
    }
  }, [liveClass]);

  const handleSave = async () => {
    if (!liveClass || !scheduledStart) {
      setError("Pick a new date and time.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await liveClassService.reschedule(liveClass.id, { scheduledStart, durationMinutes });
      toast.success("Live class rescheduled.");
      onRescheduled();
    } catch (err) {
      setError(getErrorMessage(err, "Could not reschedule the live class."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={!!liveClass} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reschedule this class?</AlertDialogTitle>
          <AlertDialogDescription>Pick a new start time — the students will be notified.</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-start" className="text-xs font-bold text-gray-700">
              New start time
            </Label>
            <Input
              id="reschedule-start"
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-duration" className="text-xs font-bold text-gray-700">
              Length (minutes)
            </Label>
            <Input
              id="reschedule-duration"
              type="number"
              min={MIN_DURATION}
              max={MAX_DURATION}
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(Math.min(MAX_DURATION, Math.max(MIN_DURATION, Number(e.target.value) || MAX_DURATION)))
              }
            />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Never mind</AlertDialogCancel>
          <Button type="button" disabled={saving} onClick={handleSave} className="bg-chestnut text-white hover:bg-chestnut/90">
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Save
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default TeacherLiveClassIndex;
