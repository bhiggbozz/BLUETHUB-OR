import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Video,
  Play,
  Users,
  Loader2,
  RefreshCw,
  Inbox,
  AlertCircle,
  Menu,
  Radio,
  Clock,
  X,
} from "lucide-react";
import { lessonService, type LessonItem } from "@/services/lesson";
import { liveClassService, type LiveClassDto } from "@/services/live-class";
import { schoolFeaturesService, LIVE_CLASS_FEATURE_KEY } from "@/services/school-features";
import { getErrorMessage } from "@/utils/errors";

const TeacherLiveClassIndex = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ openMobileNav?: () => void } | null>();
  const openMobileNav = outletContext?.openMobileNav ?? (() => {});

  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [myClasses, setMyClasses] = useState<LiveClassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

      const [lessonsRes, classesRes] = await Promise.all([
        lessonService.getMyLessons({ status: "Approved" }),
        liveClassService.getMine(),
      ]);
      const lessonData = (lessonsRes.data as any)?.data;
      setLessons((lessonData?.lessons ?? []).filter((l: LessonItem) => l.status === "Approved"));
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

  const classByLessonId = new Map(myClasses.map((c) => [c.lessonId, c]));
  const scheduledOrLive = myClasses.filter((c) => c.status === "Scheduled" || c.status === "Live");

  const handleStart = (lesson: LessonItem) => {
    navigate("/teacher/live-class/new", { state: { lesson } });
  };

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
            Run a real-time video class with up to 3 students, from an approved lesson.
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
          {scheduledOrLive.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">In progress</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {scheduledOrLive.map((liveClass) => (
                  <div key={liveClass.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                    <div className={`h-1.5 ${liveClass.status === "Live" ? "bg-red-500" : "bg-amber-400"}`} />
                    <div className="p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                            liveClass.status === "Live" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {liveClass.status === "Live" ? <Radio size={10} /> : <Clock size={10} />}
                          {liveClass.status}
                        </span>
                        <button
                          onClick={() => handleCancel(liveClass)}
                          disabled={busyId === liveClass.id || liveClass.status === "Live"}
                          title={liveClass.status === "Live" ? "End it from the live room instead" : "Cancel"}
                          className="text-gray-300 hover:text-red-500 disabled:opacity-30"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <h3 className="mb-1 line-clamp-2 text-base font-medium text-gray-900">
                        {liveClass.title || `${liveClass.subjectName} class`}
                      </h3>
                      <p className="mb-4 flex items-center gap-1 text-xs text-gray-400">
                        <Users size={12} /> {liveClass.students.length} student{liveClass.students.length === 1 ? "" : "s"} ·{" "}
                        {liveClass.classroomName}
                      </p>
                      <button
                        onClick={() =>
                          liveClass.status === "Live" ? handleRejoin(liveClass) : handleStartScheduled(liveClass)
                        }
                        disabled={busyId === liveClass.id}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-chestnut to-chestnut/90 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-chestnut/20 transition-all hover:from-chestnut/90 hover:to-chestnut/80 disabled:opacity-50"
                      >
                        {busyId === liveClass.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Play size={16} />
                        )}
                        {liveClass.status === "Live" ? "Rejoin" : "Start now"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="mb-3 text-sm font-semibold text-gray-700">Approved lessons</h2>
          {lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <Inbox size={32} className="text-gray-400" />
              </div>
              <p className="mb-1 text-lg font-semibold text-gray-700">No approved lessons</p>
              <p className="max-w-sm text-sm text-gray-400">
                Submit a lesson for approval first — once approved, you can start a live class from it.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lessons
                .filter((lesson) => !classByLessonId.has(lesson.id))
                .map((lesson) => (
                  <div
                    key={lesson.id}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:border-chestnut/30 hover:shadow-lg"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-chestnut to-chestnut/80" />
                    <div className="p-5">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-chestnut/10 transition-colors group-hover:bg-chestnut/20">
                        <Video size={22} className="text-chestnut" />
                      </div>
                      <h3 className="mb-2 line-clamp-2 text-base font-medium text-gray-900">
                        {[lesson.subjectName, lesson.topicName, lesson.subTopic || lesson.subTopicName]
                          .filter(Boolean)
                          .join(" - ") || "Lesson"}
                      </h3>
                      {lesson.aim && <p className="mb-4 line-clamp-2 text-xs font-medium text-gray-400">{lesson.aim}</p>}
                      <button
                        onClick={() => handleStart(lesson)}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-chestnut to-chestnut/90 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-chestnut/20 transition-all hover:from-chestnut/90 hover:to-chestnut/80"
                      >
                        <Video size={16} />
                        Start live class
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherLiveClassIndex;
