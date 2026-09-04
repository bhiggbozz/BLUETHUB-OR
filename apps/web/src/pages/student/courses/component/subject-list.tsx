import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { performanceService, type MyCourseDetailDto, type MyCoursePerformanceStatDto } from "@/services/performance";
import { getSubjectStyle } from "./course";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function PerformancePanel({ title, stat }: { title: string; stat: MyCoursePerformanceStatDto }) {
  const hasAttempts = stat.averageScore !== null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      {hasAttempts ? (
        <>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-extrabold text-[#4F61E8]">{stat.averageScore!.toFixed(1)}%</span>
            <span className="text-xs text-gray-400 mb-1">average score</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            {stat.position != null
              ? `${ordinal(stat.position)} of ${stat.totalStudents}`
              : "Not ranked yet"}
          </div>
          <p className="text-[11px] text-gray-400">
            {stat.attemptCount} completed attempt{stat.attemptCount === 1 ? "" : "s"}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400 py-4 text-center">No attempts yet</p>
      )}
    </div>
  );
}

interface SubjectLocationState {
  subjectName?: string;
}

const SubjectList = () => {
  const { subjectId = "" } = useParams<{ subjectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const stateSubjectName = (location.state as SubjectLocationState | null)?.subjectName;

  const [detail, setDetail] = useState<MyCourseDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg("");
    performanceService
      .getMyCourseDetail(subjectId)
      .then((res) => {
        if (!cancelled) setDetail(res.data?.data ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err instanceof AxiosError ? err.response?.status : undefined;
        setErrorMsg(status === 404 ? "This subject couldn't be found." : "Couldn't load performance for this subject.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const subjectName = detail?.subjectName ?? stateSubjectName ?? "Subject";
  const style = getSubjectStyle(subjectName);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-[#4F61E8] px-6 pt-8 pb-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-white/80 flex items-center gap-1 text-xs mb-4 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
            {style.icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-xl font-extrabold truncate">{subjectName}</h1>
            {detail && !detail.isEnrolled && (
              <span className="inline-block mt-1 text-[10px] font-semibold text-amber-100 bg-white/15 rounded-full px-2 py-0.5">
                Not one of your courses
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 py-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading performance...
          </div>
        ) : errorMsg ? (
          <div className="text-center py-16">
            <p className="text-sm font-semibold text-gray-600">{errorMsg}</p>
          </div>
        ) : detail ? (
          <>
            <PerformancePanel title="Quiz Performance" stat={detail.quiz} />
            <PerformancePanel title="Assessment Performance" stat={detail.assessment} />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default SubjectList;
