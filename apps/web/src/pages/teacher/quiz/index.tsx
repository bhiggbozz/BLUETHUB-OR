import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  EllipsisVertical,
  Loader2,
  Menu,
  PlusIcon,
  SquareChartGantt,
  UserRound,
} from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import Card from "./card";
import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";
import { quizService, type SubjectQuizItemDto } from "@/services/quiz";
import studentService, { type StudentPublishedLesson } from "@/services/student";

interface SubtopicInfo {
  name: string;
  topicName: string;
}

const QuizIndex = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();

  const [quizzes, setQuizzes] = useState<SubjectQuizItemDto[]>([]);
  const [lessons, setLessons] = useState<StudentPublishedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);

  const teacherRoleData =
    user?.roleData && isTeacherRoleData(user.roleData) ? user.roleData : null;

  const allSubjects = useMemo(() => {
    const seen = new Set<string>();
    const list: { subjectId: string; subjectName: string }[] = [];
    for (const cls of teacherRoleData?.classrooms ?? []) {
      for (const sub of cls.subjects ?? []) {
        if (!seen.has(sub.subjectId)) {
          seen.add(sub.subjectId);
          list.push({ subjectId: sub.subjectId, subjectName: sub.subjectName });
        }
      }
    }
    return list;
  }, [teacherRoleData]);

  // Load quizzes + lessons when subject changes
  useEffect(() => {
    if (!selectedSubject) {
      setQuizzes([]);
      setLessons([]);
      setSelectedSubtopic(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setQuizzes([]);
      setLessons([]);
      setSelectedSubtopic(null);
      try {
        const [quizRes, lessonRes] = await Promise.all([
          quizService.getSubjectQuizzes(selectedSubject),
          studentService.getLessonsBySubject(selectedSubject),
        ]);
        if (cancelled) return;

        setQuizzes(quizRes.data?.data ?? []);

        const lessonPayload = lessonRes.data?.data as unknown as Record<string, unknown> | undefined;
        const lessonList = (lessonPayload?.lessons ?? lessonPayload?.Lessons ?? []) as StudentPublishedLesson[];
        setLessons(lessonList);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [selectedSubject]);

  // Default to first subject on mount
  useEffect(() => {
    if (!selectedSubject && allSubjects.length > 0) {
      setSelectedSubject(allSubjects[0].subjectId);
    }
  }, [allSubjects, selectedSubject]);

  // Build subtopic map: quizCode → subtopic info (from lessons with matching quizCode)
  const quizSubtopicMap = useMemo(() => {
    const map: Record<string, SubtopicInfo> = {};
    for (const l of lessons) {
      if (l.quizCode) {
        map[l.quizCode] = {
          name: l.subTopic || "General",
          topicName: l.topicName || "",
        };
      }
    }
    return map;
  }, [lessons]);

  // Build unique subtopic list from current quizzes
  const subtopics = useMemo(() => {
    const seen = new Set<string>();
    const list: { key: string; name: string; count: number }[] = [];
    for (const q of quizzes) {
      const info = quizSubtopicMap[q.quizCode];
      const key = info?.name ?? "General";
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ key, name: info?.topicName ? `${info.topicName} — ${key}` : key, count: 0 });
      }
      const entry = list.find((e) => e.key === key);
      if (entry) entry.count++;
    }
    return list;
  }, [quizzes, quizSubtopicMap]);

  const filteredQuizzes = useMemo(() => {
    if (!selectedSubtopic) return quizzes;
    return quizzes.filter((q) => {
      const info = quizSubtopicMap[q.quizCode];
      return (info?.name ?? "General") === selectedSubtopic;
    });
  }, [quizzes, quizSubtopicMap, selectedSubtopic]);

  const totalQuizzes = filteredQuizzes.length;
  const totalAttached = filteredQuizzes.length;
  const totalQuestionsUsed = filteredQuizzes.reduce((s, q) => s + q.totalQuestions, 0);
  const totalAttempts = filteredQuizzes.reduce((s, q) => s + q.attemptStatus.completedAttempts, 0);

  return (
    <div className="font-poppins">
      <div className="backdrop-blur-sm  border border-white/20 overflow-hidden">
        {/* ── Top Nav ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-5 sticky top-0 z-30 bg-chestnut">
          
          <div className="flex items-center gap-2.5">
            {/* <LayoutGrid className="w-6 h-6 text-white hidden lg:block" /> */}
            <Menu
            className="lg:hidden w-5 h-5 text-white cursor-pointer"
            onClick={openMobileNav}  // ✅ not onClick={() => openMobileNav()}
          />
          <ArrowLeft className="lg:hidden text-white" onClick={() => navigate(-1)} />
            <span className="text-white font-semibold text-sm md:text-xl">Quiz</span>
          </div>
          <button className="text-white">
            <EllipsisVertical size={18} />
          </button>
        </div>

        {/* ── White card ───────────────────────────────────────────────── */}
        <div className="flex-1 p-4 bg-white/70 backdrop-blur-sm">
          <div className="space-y-20">
            {/* Page header row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-base font-bold text-blck-b2 leading-tight">My Quizzes</h1>
                <p className="text-sm text-[#A0A8C0] mt-0.5">
                  View quizzes by subject and subtopic
                </p>
              </div>
              <Button
                onClick={() => navigate("/teacher/assessment/generate-quiz")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-xs font-semibold bg-chestnut shrink-0 transition-opacity hover:opacity-90"
              >
                <PlusIcon />
                Create Quiz
              </Button>
            </div>

            {/* Subject pills */}
            {allSubjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {allSubjects.map((sub) => (
                  <button
                    key={sub.subjectId}
                    type="button"
                    onClick={() => { setSelectedSubject(sub.subjectId); setSelectedSubtopic(null); }}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${selectedSubject === sub.subjectId
                        ? "border-chestnut bg-chestnut/10 text-chestnut"
                        : "border-[#E8E8E3] bg-white text-[#5A5A5A] hover:border-chestnut/40"
                      }`}
                  >
                    {sub.subjectName}
                  </button>
                ))}
              </div>
            )}

            {/* Subtopic filter pills — always visible when subject is selected */}
            {selectedSubject && (
              <div className="flex flex-wrap gap-1.5 mb-3 ml-1">
                <button
                  type="button"
                  onClick={() => setSelectedSubtopic(null)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${!selectedSubtopic
                      ? "border-chestnut bg-chestnut/10 text-chestnut"
                      : "border-[#E8E8E3] bg-white text-[#5A5A5A] hover:border-chestnut/40"
                    }`}
                >
                  All ({quizzes.length})
                </button>
                {subtopics.map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setSelectedSubtopic(st.key)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${selectedSubtopic === st.key
                        ? "border-chestnut bg-chestnut/10 text-chestnut"
                        : "border-[#E8E8E3] bg-white text-[#5A5A5A] hover:border-chestnut/40"
                      }`}
                  >
                    {st.name} ({st.count})
                  </button>
                ))}
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] my-[28px]">
              <div className="border border-[#E8E8E3] bg-white rounded-md py-[18px] px-5 space-y-1">
                <div className="bg-[#EEF1FB] rounded-[9px] w-9 h-9 flex items-center justify-center">
                  <CircleHelp className="text-chestnut" />
                </div>
                <h4 className="pt-2 text-chestnut text-[28px] leading-[28px] font-semibold">
                  {totalQuizzes}
                </h4>
                <p className="text-[#5A5A5A] font-normal text-xs">Quizzes</p>
              </div>
              <div className="border border-[#E8E8E3] bg-white rounded-md py-[18px] px-5 space-y-1">
                <div className="bg-[#E6F7F2] rounded-[9px] w-9 h-9 flex items-center justify-center">
                  <Check className="text-[#16A37A]" />
                </div>
                <h4 className="pt-2 text-[#16A37A] text-[28px] leading-[28px] font-semibold">
                  {totalAttached}
                </h4>
                <p className="text-[#5A5A5A] font-normal text-xs">Attached</p>
              </div>
              <div className="border border-[#E8E8E3] bg-white rounded-md py-[18px] px-5 space-y-1">
                <div className="bg-[#EEF1FB] rounded-[9px] w-9 h-9 flex items-center justify-center">
                  <SquareChartGantt className="text-chestnut" />
                </div>
                <h4 className="pt-2 text-chestnut text-[28px] leading-[28px] font-semibold">
                  {totalQuestionsUsed}
                </h4>
                <p className="text-[#5A5A5A] font-normal text-xs">Questions</p>
              </div>
              <div className="border border-[#E8E8E3] bg-white rounded-md py-[18px] px-5 space-y-1">
                <div className="bg-[#FFF4DF] rounded-[9px] w-9 h-9 flex items-center justify-center">
                  <UserRound className="text-[#C0392B]" />
                </div>
                <h4 className="pt-2 text-[#C0392B] text-[28px] leading-[28px] font-semibold">
                  {totalAttempts}
                </h4>
                <p className="text-[#5A5A5A] font-normal text-xs">Attempts</p>
              </div>
            </div>

            {/* Quiz cards */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading quizzes…</span>
              </div>
            ) : !selectedSubject ? (
              <div className="py-16 text-center text-sm text-[#A0A8C0]">
                Select a subject above to view quizzes.
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#A0A8C0]">
                No quizzes found for this selection.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQuizzes.map((q) => (
                  <Card
                    key={q.quizCode}
                    quiz={q}
                    subtopic={quizSubtopicMap[q.quizCode]}
                    onViewDetails={(code, quizData) => navigate(`/teacher/quiz/${code}`, { state: { quiz: quizData } })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizIndex;
