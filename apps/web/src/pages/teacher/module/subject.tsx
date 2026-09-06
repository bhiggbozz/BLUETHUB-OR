import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";
import { questionService, type TopicSummary } from "@/services/question";
import { moduleService, type ModuleStudent } from "@/services/module";
import {
  quizService,
  type StudentQuizPerformanceScopedDto,
} from "@/services/quiz";
import {
  Loader2,
  Search,
  Target,
  Trophy,
  ClipboardCheck,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Menu,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

// ── Shared types ─────────────────────────────────────────────────────────────
interface SubjectInfo {
  subjectId: string;
  subjectName: string;
  subjectCategory: string;
}

interface ClassroomInfo {
  classroomId: string;
  className: string;
  subjects: SubjectInfo[];
}

type Scope = "subject" | "subtopic";

const STATUS_STYLES: Record<string, string> = {
  InProgress: "bg-amber-50 text-amber-600 border-amber-200",
  Submitted: "bg-blue-50 text-blue-600 border-blue-200",
  PartiallyGraded: "bg-purple-50 text-purple-600 border-purple-200",
  FullyGraded: "bg-green-50 text-green-600 border-green-200",
};

const fmtScore = (val: number | null | undefined) => {
  if (val == null || isNaN(val)) return "---";
  return `${Math.round(val)}%`;
};

// The raw /api/User/teacher/students response doesn't come back as a flat
// ModuleStudent — className/subjects live under roleData with inconsistent
// casing, so this reshapes it the same way module/quiz.tsx does.
const normalizeStudent = (s: any): ModuleStudent => ({
  id: String(s?.id ?? s?.Id ?? ""),
  firstName: String(s?.firstName ?? s?.FirstName ?? ""),
  lastName: String(s?.lastName ?? s?.LastName ?? ""),
  userName: String(s?.userName ?? s?.UserName ?? ""),
  emailAddress: String(s?.emailAddress ?? s?.EmailAddress ?? ""),
  className: (() => {
    const c =
      s?.roleData?.classroom ??
      s?.roleData?.Classroom ??
      s?.roleData?.classrooms?.[0] ??
      s?.roleData?.Classrooms?.[0] ??
      null;
    return String(c?.className ?? c?.ClassName ?? c?.name ?? c?.Name ?? "");
  })(),
  subjectNames: (() => {
    const raw = s?.roleData?.majorSubjects ?? s?.roleData?.MinorSubjects ?? s?.roleData?.subjects ?? [];
    return (Array.isArray(raw) ? raw : [])
      .map((sub: any) => sub.subjectName ?? sub.SubjectName ?? "")
      .filter(Boolean)
      .join(", ");
  })(),
  isActive: s?.isActive ?? s?.IsActive ?? true,
});

const scoreColor = (val: number | null | undefined) => {
  if (val == null) return "text-gray-400";
  return val >= 50 ? "text-green-600" : "text-red-600";
};

const ModuleSubject = () => {
  const { user } = useAuthContext();
  const roleData = user?.roleData;

  const classrooms = useMemo<ClassroomInfo[]>(() => {
    if (!roleData || !isTeacherRoleData(roleData)) return [];
    return (roleData.classrooms ?? []).map((c) => ({
      classroomId: c.classroomId,
      className: c.className,
      subjects: (c.subjects ?? []).map((s) => ({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        subjectCategory: s.subjectCategory,
      })),
    }));
  }, [roleData]);

  // ── Class / Subject selection ────────────────────────────────────────────
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  useEffect(() => {
    if (classrooms.length > 0 && !selectedClassroomId) {
      setSelectedClassroomId(classrooms[0].classroomId);
    }
  }, [classrooms, selectedClassroomId]);

  const availableSubjects = useMemo(() => {
    return classrooms.find((c) => c.classroomId === selectedClassroomId)?.subjects ?? [];
  }, [classrooms, selectedClassroomId]);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some((s) => s.subjectId === selectedSubjectId)) {
      setSelectedSubjectId(availableSubjects[0].subjectId);
    }
  }, [availableSubjects, selectedSubjectId]);

  // ── Scope: whole subject vs a specific subtopic ──────────────────────────
  const [scope, setScope] = useState<Scope>("subject");
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedSubTopicId, setSelectedSubTopicId] = useState("");
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    setTopics([]);
    setSelectedTopicId("");
    setSelectedSubTopicId("");
    if (!selectedClassroomId || !selectedSubjectId) return;
    setLoadingTopics(true);
    questionService
      .getSubjectQuestionSummary(selectedClassroomId, selectedSubjectId)
      .then((res) => {
        const data = res.data?.data;
        setTopics(data?.topics ?? []);
      })
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false));
  }, [selectedClassroomId, selectedSubjectId]);

  useEffect(() => {
    if (topics.length > 0 && !topics.some((t) => t.topicId === selectedTopicId)) {
      setSelectedTopicId(topics[0].topicId);
    }
  }, [topics, selectedTopicId]);

  const subtopics = useMemo(() => {
    return topics.find((t) => t.topicId === selectedTopicId)?.subTopics ?? [];
  }, [topics, selectedTopicId]);

  useEffect(() => {
    if (subtopics.length > 0 && !subtopics.some((s) => s.subTopicId === selectedSubTopicId)) {
      setSelectedSubTopicId(subtopics[0].subTopicId);
    } else if (subtopics.length === 0) {
      setSelectedSubTopicId("");
    }
  }, [subtopics, selectedSubTopicId]);

  // ── Students ──────────────────────────────────────────────────────────────
  const [students, setStudents] = useState<ModuleStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    if (!selectedClassroomId) return;
    setLoadingStudents(true);
    moduleService
      .getTeacherStudents()
      .then((res) => {
        const all = ((res.data as any)?.data ?? []).map(normalizeStudent);
        const className = classrooms.find((c) => c.classroomId === selectedClassroomId)?.className;
        setStudents(className ? all.filter((s: ModuleStudent) => s.className === className) : all);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [selectedClassroomId, classrooms]);

  useEffect(() => {
    setSelectedStudentId("");
  }, [selectedClassroomId]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.firstName, s.lastName, s.userName, s.emailAddress].join(" ").toLowerCase().includes(q),
    );
  }, [students, studentSearch]);

  // ── Performance fetch ─────────────────────────────────────────────────────
  const [performance, setPerformance] = useState<StudentQuizPerformanceScopedDto | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [performanceError, setPerformanceError] = useState("");
 const outletContext = useOutletContext<{ openMobileNav?: () => void } | null>();
  const openMobileNav = outletContext?.openMobileNav ?? (() => {});

  useEffect(() => {
    setPerformance(null);
    setPerformanceError("");

    if (!selectedStudentId) return;
    if (scope === "subject" && !selectedSubjectId) return;
    if (scope === "subtopic" && !selectedSubTopicId) return;

    setLoadingPerformance(true);
    const request =
      scope === "subject"
        ? quizService.getStudentQuizPerformanceBySubject(selectedStudentId, selectedSubjectId)
        : quizService.getStudentQuizPerformanceBySubtopic(selectedStudentId, selectedSubTopicId);

    request
      .then((res) => {
        setPerformance(res.data?.data ?? null);
      })
      .catch((err) => {
        const msg = err?.response?.data?.responseMessage ?? "Failed to load performance data.";
        setPerformanceError(msg);
      })
      .finally(() => setLoadingPerformance(false));
  }, [scope, selectedStudentId, selectedSubjectId, selectedSubTopicId]);

  const sortedQuizzes = useMemo(() => {
    const quizzes = performance?.quizzes ?? [];
    return [...quizzes].sort((a, b) => {
      const at = a.latestSubmittedAt ? new Date(a.latestSubmittedAt).getTime() : 0;
      const bt = b.latestSubmittedAt ? new Date(b.latestSubmittedAt).getTime() : 0;
      return bt - at;
    });
  }, [performance]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
        <Menu className="lg:hidden  w-5 h-5 text-black inline" onClick={openMobileNav} />
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6">
          <h1 className="text-base font-semibold text-[#292382]">Student Quiz Performance</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View how a student is performing on quizzes for a subject, or drill into a single subtopic.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Class</label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full mt-1 text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-[#292382] font-medium focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent appearance-none"
              >
                {classrooms.map((c) => (
                  <option key={c.classroomId} value={c.classroomId}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full mt-1 text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-[#292382] font-medium focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent appearance-none"
              >
                {availableSubjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scope toggle */}
          <div className="mt-4 inline-flex items-center gap-1 bg-gray-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => setScope("subject")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                scope === "subject" ? "bg-[#292382] text-white shadow-sm" : "text-gray-500 hover:text-[#292382]"
              }`}
            >
              By Subject
            </button>
            <button
              type="button"
              onClick={() => setScope("subtopic")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                scope === "subtopic" ? "bg-[#292382] text-white shadow-sm" : "text-gray-500 hover:text-[#292382]"
              }`}
            >
              By Subtopic
            </button>
          </div>

          {/* Topic / Subtopic selection */}
          {scope === "subtopic" && (
            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              <div className="flex-1">
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Topic
                  {loadingTopics && <Loader2 className="w-3 h-3 animate-spin text-[#292382]" />}
                </label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  disabled={loadingTopics || topics.length === 0}
                  className="w-full mt-1 text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-[#292382] font-medium focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent appearance-none disabled:opacity-50"
                >
                  {topics.length === 0 && <option>{loadingTopics ? "Loading topics..." : "No topics found"}</option>}
                  {topics.map((t) => (
                    <option key={t.topicId} value={t.topicId}>
                      {t.topicName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Subtopic</label>
                <select
                  value={selectedSubTopicId}
                  onChange={(e) => setSelectedSubTopicId(e.target.value)}
                  disabled={loadingTopics || subtopics.length === 0}
                  className="w-full mt-1 text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-[#292382] font-medium focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent appearance-none disabled:opacity-50"
                >
                  {subtopics.length === 0 && <option>{loadingTopics ? "Loading subtopics..." : "No subtopics found"}</option>}
                  {subtopics.map((s) => (
                    <option key={s.subTopicId} value={s.subTopicId}>
                      {s.subTopicName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Student picker */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent"
              />
            </div>
          </div>

          {loadingStudents ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading students...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-400 font-medium">No students found in this class.</p>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudentId === student.id;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition-colors ${
                      isSelected ? "bg-[#292382]/5" : "hover:bg-gray-50/80"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#292382] to-[#3D36A8] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      {student.firstName?.[0]}
                      {student.lastName?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isSelected ? "text-[#292382]" : "text-gray-700"}`}>
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{student.userName}</p>
                    </div>
                    {isSelected && loadingPerformance && (
                      <Loader2 className="w-4 h-4 text-[#292382] shrink-0 animate-spin" />
                    )}
                    {isSelected && !loadingPerformance && (
                      <CheckCircle2 className="w-4 h-4 text-[#292382] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Performance results */}
        {selectedStudentId && (
          <div className="space-y-4">
            {loadingPerformance && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#292382]" />
                <span className="text-sm text-gray-400">Loading performance data...</span>
              </div>
            )}

            {!loadingPerformance && performanceError && (
              <div className="bg-red-50/80 backdrop-blur border border-red-200 rounded-2xl p-6 text-center">
                <p className="text-sm text-red-600 font-medium">{performanceError}</p>
              </div>
            )}

            {!loadingPerformance && !performanceError && performance && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6">
                  <p className="text-sm font-semibold text-[#292382]">
                    {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : performance.studentName}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {scope === "subject"
                      ? performance.subjectName
                      : `${performance.subTopicName || "Subtopic"} · ${performance.subjectName}`}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-gray-50 rounded-xl border border-gray-200/80 p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Quizzes</p>
                      </div>
                      <p className="text-base font-bold text-[#292382]">{performance.totalQuizzes}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl border border-gray-200/80 p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Target className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Avg Score</p>
                      </div>
                      <p className={`text-base font-bold ${scoreColor(performance.averageScorePercent)}`}>
                        {fmtScore(performance.averageScorePercent)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl border border-gray-200/80 p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <ClipboardCheck className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Pass Rate</p>
                      </div>
                      <p className={`text-base font-bold ${scoreColor(performance.passRate)}`}>
                        {fmtScore(performance.passRate)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl border border-gray-200/80 p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Best</p>
                      </div>
                      <p className={`text-base font-bold ${scoreColor(performance.bestScorePercent)}`}>
                        {fmtScore(performance.bestScorePercent)}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-3">
                    {performance.completedAttempts} completed · {performance.inProgressAttempts} in progress ·{" "}
                    {performance.totalAttempts} total attempts
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-[#292382]">Quizzes</h2>
                  </div>

                  {sortedQuizzes.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">
                        No quiz attempts found for this {scope === "subject" ? "subject" : "subtopic"} yet.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {sortedQuizzes.map((q) => (
                        <div key={q.attemptId} className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#292382] truncate">
                              {q.lessonTitle || `Quiz ${q.quizCode}`}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {q.subjectName}
                              {q.classroomName ? ` · ${q.classroomName}` : ""}
                              {q.attemptCount ? ` · ${q.attemptCount} attempt${q.attemptCount !== 1 ? "s" : ""}` : ""}
                              {q.latestSubmittedAt ? ` · ${new Date(q.latestSubmittedAt).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                STATUS_STYLES[q.latestStatus] ?? "bg-gray-50 text-gray-500 border-gray-200"
                              }`}
                            >
                              {q.latestStatus}
                            </span>
                            <span className={`text-sm font-bold ${scoreColor(q.bestScorePercent)}`}>
                              {fmtScore(q.bestScorePercent)}
                            </span>
                            {q.isPassed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleSubject;
