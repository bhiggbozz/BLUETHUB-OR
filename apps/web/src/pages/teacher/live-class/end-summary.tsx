import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Clock, Users, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import { liveClassService, type LiveClassDto } from "@/services/live-class";

interface EndSummaryState {
  liveClass?: LiveClassDto;
  endReason?: string;
  /** Whether the board/audio manifest for this class actually submitted —
   * set by TeacherLiveClassRoom's isolated recorder. `undefined` means we
   * don't know (e.g. a student landed here, or the page was reloaded). */
  recordingSaved?: boolean;
}

const formatDuration = (startedAt: string | null, endedAt: string | null): string => {
  if (!startedAt || !endedAt) return "—";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.max(0, Math.round(ms / 60000));
  return `${minutes} min`;
};

const EndSummary = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as EndSummaryState | null;
  const stateLiveClass = navState?.liveClass;
  const endReason = navState?.endReason;
  const recordingSaved = navState?.recordingSaved;

  const [liveClass, setLiveClass] = useState<LiveClassDto | null>(stateLiveClass ?? null);

  useEffect(() => {
    if (liveClass || !id) return;
    void liveClassService.getById(id).then((res) => setLiveClass(res.data.data)).catch(() => {});
  }, [id, liveClass]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50/50 p-6 font-poppins">
      <div className="mt-10 w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>
        <h1 className="mb-1 text-lg font-bold text-gray-900">Class ended</h1>
        <p className="mb-6 text-sm text-gray-500">
          {liveClass?.title || "Your live class"} has ended
          {endReason === "TimeUp" ? " — the 40-minute limit was reached." : "."}
        </p>

        {liveClass && (
          <div className="mb-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
                <Clock size={12} /> Duration
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {formatDuration(liveClass.startedAt, liveClass.endedAt)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
                <Users size={12} /> Students joined
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {liveClass.students.filter((s) => s.firstJoinedAt).length} / {liveClass.students.length}
              </p>
            </div>
          </div>
        )}

        {recordingSaved === false ? (
          <div className="mb-6 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-left text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              The recording couldn't be saved for this class, so no replay will be available. The class itself ended
              normally — nothing else was affected.
            </span>
          </div>
        ) : (
          <div className="mb-6 rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
            The recording has been saved and will appear as a replay once the lesson publishes.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={() => navigate("/teacher/live-class")} className="bg-chestnut text-white hover:bg-chestnut/90">
            Back to Live Classes
          </Button>
          {liveClass?.lessonId && (
            <Button variant="outline" onClick={() => navigate("/teacher/my-lessons")} className="gap-1.5">
              View lesson <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EndSummary;
