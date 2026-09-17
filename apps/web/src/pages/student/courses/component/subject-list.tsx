import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  ClipboardList,
  FileCheck2,
  ChevronDown,
  BookOpen,
  Circle,
  CircleDot,
  RefreshCw,
} from "lucide-react";
import {
  performanceService,
  type MyCourseDetailDto,
  type MyCoursePerformanceStatDto,
  // ⚠️ Confirm these match your actual service/types — named to mirror
  // getMyCourseDetail / MyCourseDetailDto until you tell me the real ones.
} from "@/services/performance";
import { getSubjectStyle } from "./course";
import { isStudentRoleData, useAuthContext } from "@/contexts/auth-context";

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

function scoreTone(score: number) {
  if (score >= 70) return { text: "text-emerald-600", bar: "bg-emerald-500", chipBg: "bg-emerald-50" };
  if (score >= 40) return { text: "text-amber-600", bar: "bg-amber-500", chipBg: "bg-amber-50" };
  return { text: "text-red-600", bar: "bg-red-500", chipBg: "bg-red-50" };
}

function ScoreBar({ value }: { value: number }) {
  const tone = scoreTone(value);
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${tone.bar} transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function PerformancePanel({
  title,
  icon,
  stat,
  emptyHint,
}: {
  title: string;
  icon: React.ReactNode;
  stat: MyCoursePerformanceStatDto;
  emptyHint: string;
}) {
  const hasAttempts = stat.averageScore !== null;
  const tone = hasAttempts ? scoreTone(stat.averageScore!) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400">{icon}</span>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>

      {hasAttempts ? (
        <>
          <div className="flex items-end gap-1.5">
            <span className={`text-3xl font-extrabold ${tone!.text}`}>
              {stat.averageScore!.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400 mb-1">average score</span>
          </div>

          <ScoreBar value={stat.averageScore!} />

          <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-0.5">
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
        <div className="py-4 text-center space-y-1">
          <p className="text-sm font-medium text-gray-500">No attempts yet</p>
          <p className="text-[11px] text-gray-400">{emptyHint}</p>
        </div>
      )}
    </div>
  );
}

function CurriculumAccordion({ curriculum }: { curriculum: MyCourseCurriculumDto }) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(curriculum.topics[0] ? [curriculum.topics[0].id] : [])
  );

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalSubTopics = curriculum.topics.reduce((sum, t) => sum + t.subTopics.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-800">Curriculum</h2>
        </div>
        <span className="text-[11px] text-gray-400">
          {curriculum.topics.length} topics · {totalSubTopics} lessons
        </span>
      </div>

      {(curriculum.category || curriculum.classCategory) && (
        <div className="flex gap-1.5">
          {curriculum.category && (
            <span className="text-[10px] font-semibold text-[#4F61E8] bg-[#4F61E81A] rounded-full px-2 py-0.5">
              {curriculum.category}
            </span>
          )}
          {curriculum.classCategory && (
            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              {curriculum.classCategory}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {curriculum.topics.map((topic, i) => {
          const isOpen = openIds.has(topic.id);
          return (
            <div
              key={topic.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(topic.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <span className="shrink-0 size-7 rounded-lg bg-[#4F61E81A] text-[#4F61E8] text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-800 truncate">
                    {topic.name}
                  </span>
                  <span className="block text-[11px] text-gray-400">
                    {topic.subTopics.length} lesson{topic.subTopics.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-0 -mt-1 space-y-1">
                  {topic.subTopics.map((sub) => (
                    <div
                      key={sub.id}
                      className={`flex items-center gap-2.5 py-2 pl-10 pr-2 rounded-lg ${sub.isActive ? "" : "opacity-50"
                        }`}
                    >
                      {sub.isActive ? (
                        <CircleDot className="w-3.5 h-3.5 text-[#4F61E8] shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      )}
                      <span className="text-[13px] text-gray-700 truncate">{sub.name}</span>
                      {!sub.isActive && (
                        <span className="ml-auto shrink-0 text-[9px] font-semibold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                          Coming soon
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SubjectLocationState {
  subjectName?: string;
}
export interface MyCourseCurriculumDto {
  subjectId: string;
  subjectName: string;
  category: string;
  classCategory: string;
  classroomId: string;
  topics: {
    id: string;
    name: string;
    subjectId: string;
    subTopics: {
      id: string;
      name: string;
      topicId: string;
      isActive: boolean;
    }[];
  }[];
}

const SubjectList = () => {
  const { user } = useAuthContext();
  const roleData = user?.roleData
  const classroomId = roleData ? isStudentRoleData(roleData) ? roleData.classroom.classroomId : "" : "";
  const { subjectId = "" } = useParams<{ subjectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const stateSubjectName = (location.state as SubjectLocationState | null)?.subjectName;

  const [detail, setDetail] = useState<MyCourseDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [curriculum, setCurriculum] = useState<MyCourseCurriculumDto | null>(null); // Debugging line
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState("");

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

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    setCurriculumLoading(true);
    setCurriculumError("");
    performanceService
      .getMyCourseCurriculum(subjectId, classroomId)
      .then((res) => {
        if (!cancelled) setCurriculum(res.data?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setCurriculumError("Couldn't load the curriculum for this subject.");
      })
      .finally(() => {
        if (!cancelled) setCurriculumLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const subjectName = detail?.subjectName ?? curriculum?.subjectName ?? stateSubjectName ?? "Subject";
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

      <div className="px-4 -mt-4 py-4 space-y-6">
        {/* Performance */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PerformancePanel
              title="Quiz Performance"
              icon={<ClipboardList className="w-3.5 h-3.5" />}
              stat={detail.quiz}
              emptyHint="Take a quiz to see your score here."
            />
            <PerformancePanel
              title="Assessment Performance"
              icon={<FileCheck2 className="w-3.5 h-3.5" />}
              stat={detail.assessment}
              emptyHint="Complete an assessment to see your score here."
            />
          </div>
        ) : null}

        {/* Curriculum */}
        {curriculumLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading curriculum...
          </div>
        ) : curriculumError ? (
          <div className="text-center py-10 space-y-2">
            <p className="text-sm font-semibold text-gray-500">{curriculumError}</p>
            <button
              type="button"
              onClick={() => setCurriculumLoading(true) /* effect re-runs on subjectId only; wire a retry counter if needed */}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4F61E8] hover:underline"
            >
              <RefreshCw className="size-3.5" />
              Try again
            </button>
          </div>
        ) : curriculum && curriculum.topics.length > 0 ? (
          <CurriculumAccordion curriculum={curriculum} />
        ) : curriculum ? (
          <div className="text-center py-10">
            <p className="text-sm font-medium text-gray-500">Curriculum not published yet for this subject.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SubjectList;