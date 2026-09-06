import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";
import { performanceService, type StudentPerformanceDetailDto, type PerformanceAttemptDto } from "@/services/performance";
import { schoolService } from "@/services/school";
import { moduleService, type ModuleStudent } from "@/services/module";
import { quizService, type SubjectQuizPerformanceDto } from "@/services/quiz";
import { Loader2, ChevronDown, ChevronRight, Users, Target, ClipboardCheck, BarChart3, Search, CheckCircle2, XCircle, GraduationCap, Trophy, FileQuestion, Menu } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";

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

// ── Topic view types ─────────────────────────────────────────────────────────
interface TopicPerformanceData {
  topicId: string;
  topicName: string;
  averageScorePercent: number | null;
  passRate: number | null;
  studentCount: number;
  totalAttempts: number;
  completedAttempts: number;
  loading: boolean;
}

// ── Student view helpers ─────────────────────────────────────────────────────
const normalizeStudent = (s: any): ModuleStudent => ({
  id: String(s?.id ?? s?.Id ?? ""),
  firstName: String(s?.firstName ?? s?.FirstName ?? ""),
  lastName: String(s?.lastName ?? s?.LastName ?? ""),
  userName: String(s?.userName ?? s?.UserName ?? ""),
  emailAddress: String(s?.emailAddress ?? s?.EmailAddress ?? ""),
  className: (() => {
    const c = s?.roleData?.classroom ?? s?.roleData?.Classroom ?? s?.roleData?.classrooms?.[0] ?? s?.roleData?.Classrooms?.[0] ?? null;
    return String(c?.className ?? c?.ClassName ?? c?.name ?? c?.Name ?? "");
  })(),
  subjectNames: (() => {
    const raw = s?.roleData?.majorSubjects ?? s?.roleData?.MinorSubjects ?? s?.roleData?.subjects ?? [];
    return (Array.isArray(raw) ? raw : []).map((sub: any) => sub.subjectName ?? sub.SubjectName ?? "").filter(Boolean).join(", ");
  })(),
  isActive: s?.isActive ?? s?.IsActive ?? true,
});

const ModuleQuiz = () => {
  const { user } = useAuthContext();
  const roleData = user?.roleData;
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view");
  // Three real sidebar entries, three real views: Quiz (default, per-quiz
  // performance), Topic (per-topic drill-down), Student (per-student browsing).
  const activeView: "quiz" | "topic" | "student" =
    view === "student" ? "student" : view === "topic" ? "topic" : "quiz";

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

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [retryKey, setRetryKey] = useState(0);
  const fetchedClassrooms = useRef(new Set<string>());

  useEffect(() => {
    if (classrooms.length > 0 && !selectedClassroomId) {
      setSelectedClassroomId(classrooms[0].classroomId);
    }
  }, [classrooms]);

  const fmtScore = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return "---";
    return `${Math.round(val)}%`;
  };

  const scoreColor = (val: number | null | undefined) => {
    if (val == null) return "text-gray-400";
    return val >= 50 ? "text-green-600" : "text-red-600";
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPIC VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  const [fetchedSubjects, setFetchedSubjects] = useState<SubjectInfo[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [topicNames, setTopicNames] = useState<{ id: string; name: string }[]>([]);
  const [topicPerformance, setTopicPerformance] = useState<Record<string, TopicPerformanceData>>({});

  const availableSubjects = useMemo(() => {
    if (!selectedClassroomId) return [];
    const fromRoleData = classrooms.find((c) => c.classroomId === selectedClassroomId)?.subjects;
    if (fromRoleData && fromRoleData.length > 0) return fromRoleData;
    return fetchedSubjects;
  }, [classrooms, selectedClassroomId, fetchedSubjects]);

  useEffect(() => {
    if (!selectedClassroomId) return;
    const hasRoleDataSubjects = classrooms.find((c) => c.classroomId === selectedClassroomId)?.subjects?.length;
    if (hasRoleDataSubjects) return;
    if (fetchedClassrooms.current.has(selectedClassroomId)) return;
    fetchedClassrooms.current.add(selectedClassroomId);
    schoolService.getSubjectsByClassroomId(selectedClassroomId)
      .then((res) => {
        const obj = (res.data as any)?.data ?? {};
        const major: any[] = obj.majorSubjects ?? obj.MajorSubjects ?? [];
        const minor: any[] = obj.minorSubjects ?? obj.MinorSubjects ?? [];
        const all = [...major, ...minor];
        const mapped: SubjectInfo[] = all.map((s: any) => ({
          subjectId: String(s.id ?? s.subjectId ?? ""),
          subjectName: String(s.subject ?? s.subjectName ?? s.name ?? ""),
          subjectCategory: String(s.category ?? s.subjectCategory ?? ""),
        }));
        setFetchedSubjects(mapped);
      })
      .catch(() => setFetchedSubjects([]));
  }, [selectedClassroomId, classrooms]);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some((s) => s.subjectId === selectedSubjectId)) {
      setSelectedSubjectId(availableSubjects[0].subjectId);
    }
  }, [availableSubjects, selectedSubjectId]);

  useEffect(() => {
    if (activeView !== "topic") return;
    if (!selectedSubjectId || !selectedClassroomId) return;
    setLoading(true);
    setError("");

    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Request timed out. Please check your connection and try again.");
    }, 20000);

    Promise.all([
      schoolService.getSubjectCurriculum(selectedSubjectId, selectedClassroomId),
      performanceService.getSubjectTopicPerformance(selectedSubjectId, selectedClassroomId),
    ])
      .then(([curriculumRes, perfRes]) => {
        const curriculum = (curriculumRes.data as any)?.data ?? {};
        const rawTopics: any[] = curriculum.topics ?? curriculum.Topics ?? [];
        setTopicNames(rawTopics.map((t: any) => ({
          id: String(t.id ?? t.Id ?? t.topicId ?? ""),
          name: String(t.name ?? t.Name ?? t.topicName ?? ""),
        })));

        const perfTopics: any[] = perfRes.data.data ?? [];
        const perf: Record<string, TopicPerformanceData> = {};
        for (const t of perfTopics) {
          perf[t.topicId ?? ""] = {
            topicId: t.topicId ?? "",
            topicName: t.topicName ?? "",
            averageScorePercent: t.averageScorePercent ?? t.averageScore ?? null,
            passRate: t.passRate ?? null,
            studentCount: t.studentCount ?? 0,
            totalAttempts: t.totalAttempts ?? 0,
            completedAttempts: t.completedAttempts ?? 0,
            loading: false,
          };
        }
        setTopicPerformance(perf);
        setExpandedTopicId(null);
      })
      .catch((e) => { console.warn("load failed", e); setTopicNames([]); setTopicPerformance({}); })
      .finally(() => { clearTimeout(timeout); setLoading(false); });
  }, [activeView, selectedSubjectId, selectedClassroomId, retryKey]);

  const fetchTopicDetail = (topicId: string) => {
    if (!selectedSubjectId || !selectedClassroomId) return;
    setExpandedTopicId(topicId);
    if (topicPerformance[topicId]) return;
    setTopicPerformance((prev) => ({ ...prev, [topicId]: { topicId, topicName: "", averageScorePercent: null, passRate: null, studentCount: 0, totalAttempts: 0, completedAttempts: 0, loading: true } }));
    performanceService.getSubjectTopicPerformance(selectedSubjectId, selectedClassroomId)
      .then((res) => {
        const perfTopics: any[] = res.data.data ?? [];
        const t = perfTopics.find((p: any) => p.topicId === topicId);
        if (!t) return;
        setTopicPerformance((prev) => ({
          ...prev,
          [topicId]: {
            topicId: t.topicId ?? "",
            topicName: t.topicName ?? "",
            averageScorePercent: t.averageScorePercent ?? t.averageScore ?? null,
            passRate: t.passRate ?? null,
            studentCount: t.studentCount ?? 0,
            totalAttempts: t.totalAttempts ?? 0,
            completedAttempts: t.completedAttempts ?? 0,
            loading: false,
          },
        }));
      })
      .catch(() => { setTopicPerformance((prev) => ({ ...prev, [topicId]: { ...prev[topicId], loading: false } })); });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  const [students, setStudents] = useState<ModuleStudent[]>([]);
  const [studentPerformanceRecords, setStudentPerformanceRecords] = useState<Map<string, StudentPerformanceDetailDto>>(new Map());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const outletContext = useOutletContext<{ openMobileNav?: () => void } | null>();
    const openMobileNav = outletContext?.openMobileNav ?? (() => {});

  useEffect(() => {
    if (view !== "student") return;
    if (!selectedClassroomId) return;
    setLoadingStudents(true);
    moduleService.getTeacherStudents()
      .then((res) => {
        const all: ModuleStudent[] = ((res.data as any)?.data ?? []).map(normalizeStudent);
        setStudents(all.filter((s) => s.className === classrooms.find((c) => c.classroomId === selectedClassroomId)?.className));
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [view, selectedClassroomId]);

  const fetchStudentPerformance = async (studentId: string) => {
    if (studentPerformanceRecords.has(studentId)) {
      setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
      return;
    }
    try {
      const res = await performanceService.getStudentQuizPerformance(studentId);
      const data = (res.data as any)?.data as StudentPerformanceDetailDto | undefined;
      setStudentPerformanceRecords((prev) => new Map(prev).set(studentId, data ?? {} as StudentPerformanceDetailDto));
      setExpandedStudentId(studentId);
    } catch {
      setStudentPerformanceRecords((prev) => new Map(prev).set(studentId, {} as StudentPerformanceDetailDto));
      setExpandedStudentId(studentId);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.firstName, s.lastName, s.userName, s.emailAddress].join(" ").toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  // ═══════════════════════════════════════════════════════════════════════════
  // QUIZ VIEW — flat per-quiz performance, distinct from the per-topic
  // drill-down in Topic view.
  // ═══════════════════════════════════════════════════════════════════════════
  const [quizPerformance, setQuizPerformance] = useState<SubjectQuizPerformanceDto[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [quizError, setQuizError] = useState("");

  // A primitive, not the whole `classrooms` array — `classrooms` is a
  // useMemo keyed on `roleData`, which gets a fresh object reference every
  // time the user is re-hydrated (login, then again post-hydrate, possible
  // refreshUser calls...). Depending on the array itself re-fires this
  // effect — and re-hits the API — on every one of those, not just on an
  // actual class change.
  const selectedClassName = useMemo(
    () => classrooms.find((c) => c.classroomId === selectedClassroomId)?.className,
    [classrooms, selectedClassroomId],
  );

  useEffect(() => {
    if (activeView !== "quiz") return;
    if (!selectedSubjectId || !selectedClassroomId) return;
    setLoadingQuizzes(true);
    setQuizError("");
    quizService
      .getSubjectQuizPerformance(selectedSubjectId)
      .then((res) => {
        const all = res.data?.data ?? [];
        setQuizPerformance(selectedClassName ? all.filter((q) => q.classroomName === selectedClassName) : all);
      })
      .catch(() => {
        setQuizPerformance([]);
        setQuizError("Failed to load quiz performance.");
      })
      .finally(() => setLoadingQuizzes(false));
  }, [activeView, selectedSubjectId, selectedClassroomId, selectedClassName]);

  // ── Render ────────────────────────────────────────────────────────────────
  const isStudentView = activeView === "student";

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
        <Menu className="lg:hidden  w-5 h-5 text-black inline" onClick={openMobileNav} />
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6">
          <h1 className="text-base font-semibold text-[#292382]">
            {activeView === "student" ? "Student Performance" : activeView === "topic" ? "Topic Performance" : "Quiz Performance"}
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Class</label>
              <select
                value={selectedClassroomId}
                onChange={(e) => { setSelectedClassroomId(e.target.value); setSelectedSubjectId(""); }}
                className="w-full mt-1 text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-[#292382] font-medium focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent appearance-none"
              >
                {classrooms.map((c) => (
                  <option key={c.classroomId} value={c.classroomId}>{c.className}</option>
                ))}
              </select>
            </div>
            {!isStudentView && (
              <div className="flex-1">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full mt-1 text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-[#292382] font-medium focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent appearance-none"
                >
                  {availableSubjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {activeView === "student" ? (
          // ══════════════════════════════════════════════════════════════════
          // STUDENT VIEW
          // ══════════════════════════════════════════════════════════════════
          <>
            {loadingStudents && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#292382]" />
                <span className="text-sm text-gray-400">Loading students...</span>
              </div>
            )}

            {!loadingStudents && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                {/* Search */}
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

                {/* Student count */}
                <div className="px-4 sm:px-5 py-2.5 bg-gray-50/50 border-b border-gray-100">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-[#292382]">{filteredStudents.length}</span> student{filteredStudents.length !== 1 ? "s" : ""}
                    {studentSearch && ` matching "${studentSearch}"`}
                  </p>
                </div>

                {/* Student list */}
                <div className="divide-y divide-gray-100">
                  {filteredStudents.length === 0 && (
                    <div className="py-16 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">No students found in this class.</p>
                    </div>
                  )}
                  {filteredStudents.map((student) => {
                    const isOpen = expandedStudentId === student.id;
                    const record = studentPerformanceRecords.get(student.id);
                    const avgScore = record?.averageScorePercent ?? null;
                    const bestScore = record?.bestScorePercent ?? null;
                    const passRate = record?.passRate ?? null;
                    const recentAttempts: PerformanceAttemptDto[] = record?.recentAttempts ?? [];
                    const hasAttempts = (record?.totalAttempts ?? 0) > 0;

                    return (
                      <div key={student.id}>
                        <button
                          type="button"
                          onClick={() => fetchStudentPerformance(student.id)}
                          className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#292382] to-[#3D36A8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-sm font-semibold text-[#292382] truncate">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">{student.className || student.userName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {avgScore !== null && (
                              <span className={`text-sm font-bold ${scoreColor(avgScore)}`}>{avgScore}%</span>
                            )}
                            {bestScore !== null && bestScore > 0 && (
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 text-[#292382]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t border-gray-50 bg-gray-50/50 px-4 sm:px-5 py-4 space-y-3">
                            {!hasAttempts && (
                              <p className="text-sm text-gray-400 text-center py-4">No quiz attempts yet.</p>
                            )}
                            {hasAttempts && (
                              <>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="bg-white rounded-xl border border-gray-200/80 p-3 text-center">
                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Avg</p>
                                    <p className={`text-base font-bold ${scoreColor(avgScore)}`}>{fmtScore(avgScore)}</p>
                                  </div>
                                  <div className="bg-white rounded-xl border border-gray-200/80 p-3 text-center">
                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Best</p>
                                    <p className={`text-base font-bold ${bestScore != null && bestScore >= 50 ? "text-green-600" : "text-red-600"}`}>{fmtScore(bestScore)}</p>
                                  </div>
                                  <div className="bg-white rounded-xl border border-gray-200/80 p-3 text-center">
                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Pass</p>
                                    <p className={`text-base font-bold ${scoreColor(passRate)}`}>{fmtScore(passRate)}</p>
                                  </div>
                                  <div className="bg-white rounded-xl border border-gray-200/80 p-3 text-center">
                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Done</p>
                                    <p className="text-base font-bold text-[#292382]">{record?.completedAttempts ?? 0}/{record?.totalAttempts ?? 0}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {recentAttempts.map((a, i) => (
                                    <div key={a.attemptId || i} className="bg-white rounded-xl border border-gray-200/80 p-3.5 sm:p-4 flex items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[#292382] truncate">{a.lessonTitle || `Quiz ${a.quizCode}`}</p>
                                        <p className="text-[11px] text-gray-500">
                                          {a.subjectName}{a.classroomName ? ` · ${a.classroomName}` : ""}
                                          {a.submittedAt ? ` · ${new Date(a.submittedAt).toLocaleDateString()}` : ""}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs text-gray-400`}>#{a.attemptNumber}</span>
                                        <span className={`text-sm font-bold ${(a.finalScorePercent ?? 0) >= 50 ? "text-green-600" : "text-red-600"}`}>
                                          {a.finalScorePercent ?? 0}%
                                        </span>
                                        {a.isPassed === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        {a.isPassed === false && <XCircle className="w-4 h-4 text-red-500" />}
                                        {a.isPassed === null && (
                                          <span className="text-[11px] text-amber-600 font-medium">Pending</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : activeView === "topic" ? (
          // ══════════════════════════════════════════════════════════════════
          // TOPIC VIEW
          // ══════════════════════════════════════════════════════════════════
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#292382]" />
                <span className="text-sm text-gray-400">Loading performance data...</span>
              </div>
            )}

            {error && !loading && (
              <div className="bg-red-50/80 backdrop-blur border border-red-200 rounded-2xl p-8 text-center">
                <p className="text-sm text-red-600 font-medium">{error}</p>
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="mt-4 text-sm font-semibold text-red-700 hover:text-red-800 underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                {topicNames.length === 0 && (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">No topics found for this subject.</p>
                  </div>
                )}
                <div className="divide-y divide-gray-100">
                  {topicNames.map((topic) => {
                    const isOpen = expandedTopicId === topic.id;
                    const perf = topicPerformance[topic.id];

                    return (
                      <div key={topic.id}>
                        <button
                          type="button"
                          onClick={() => fetchTopicDetail(topic.id)}
                          className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 shrink-0 text-[#292382]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
                            )}
                            <span className="text-sm font-semibold text-[#292382] truncate">{topic.name}</span>
                          </div>
                          {perf && !perf.loading && (
                            <span className={`text-sm font-bold shrink-0 ml-3 ${scoreColor(perf.averageScorePercent)}`}>
                              {fmtScore(perf.averageScorePercent)}
                            </span>
                          )}
                        </button>

                        {isOpen && (
                          <div className="border-t border-gray-50 bg-gray-50/50 px-4 sm:px-6 py-4 sm:py-5">
                            {perf?.loading ? (
                              <div className="flex items-center justify-center py-6 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-[#292382]" />
                                <span className="text-sm text-gray-400">Loading...</span>
                              </div>
                            ) : perf ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <Target className="w-3.5 h-3.5 text-gray-400" />
                                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase tracking-wider">Avg Score</p>
                                  </div>
                                  <p className={`text-base sm:text-lg font-bold ${scoreColor(perf.averageScorePercent)}`}>
                                    {fmtScore(perf.averageScorePercent)}
                                  </p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <ClipboardCheck className="w-3.5 h-3.5 text-gray-400" />
                                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase tracking-wider">Pass Rate</p>
                                  </div>
                                  <p className={`text-base sm:text-lg font-bold ${scoreColor(perf.passRate)}`}>
                                    {fmtScore(perf.passRate)}
                                  </p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase tracking-wider">Students</p>
                                  </div>
                                  <p className="text-base sm:text-lg font-bold text-[#292382]">{perf.studentCount}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase tracking-wider">Attempts</p>
                                  </div>
                                  <p className="text-base sm:text-lg font-bold text-[#292382]">{perf.completedAttempts}/{perf.totalAttempts}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 text-center py-4">No performance data for this topic.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          // ══════════════════════════════════════════════════════════════════
          // QUIZ VIEW — flat per-quiz performance
          // ══════════════════════════════════════════════════════════════════
          <>
            {loadingQuizzes && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#292382]" />
                <span className="text-sm text-gray-400">Loading quiz performance...</span>
              </div>
            )}

            {quizError && !loadingQuizzes && (
              <div className="bg-red-50/80 backdrop-blur border border-red-200 rounded-2xl p-8 text-center">
                <p className="text-sm text-red-600 font-medium">{quizError}</p>
              </div>
            )}

            {!loadingQuizzes && !quizError && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                {quizPerformance.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                      <FileQuestion className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">No quizzes found for this subject.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {quizPerformance.map((q) => (
                      <div key={q.lessonId} className="px-4 sm:px-6 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#292382] break-words">{q.lessonTitle}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{q.quizCode}</p>
                          </div>
                          <span className={`text-sm font-bold shrink-0 ${scoreColor(q.averageScorePercent)}`}>
                            {fmtScore(q.averageScorePercent)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Pass Rate</p>
                            <p className={`text-sm font-bold ${scoreColor(q.passRate)}`}>{fmtScore(q.passRate)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Students</p>
                            <p className="text-sm font-bold text-[#292382]">{q.totalStudents}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Attempts</p>
                            <p className="text-sm font-bold text-[#292382]">{q.completedAttempts}/{q.totalAttempts}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ModuleQuiz;
