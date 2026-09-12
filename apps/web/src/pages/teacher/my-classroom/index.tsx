import { useAuthContext, isTeacherRoleData } from "@/contexts/auth-context";
import moduleService, { type ModuleStudent } from "@/services/module";
import { performanceService, type PerformanceClassroomDto } from "@/services/performance";
import quizService from "@/services/quiz";
import { adminService, type ResetStudentPasswordData } from "@/services/admin";
import ResetPasswordDialog from "@/component/reset-password-dialog";
import toast from "react-hot-toast";
import {
  BookOpen,
  Users,
  GraduationCap,
  BarChart3,
  Loader2,
  Search,
  Menu,
  ChevronRight,
  School,
  FileQuestion,
  ClipboardCheck,
  KeyRound,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";

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
  isActive: Boolean(s?.isActive ?? s?.IsActive ?? false),
});

function getSubjectCategory(student: ModuleStudent, subjectName: string): boolean {
  return student.subjectNames.toLowerCase().includes(subjectName.toLowerCase());
}

const MyClassroomPage = () => {
  const { user } = useAuthContext();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>() ?? {};
  const navigate = useNavigate();

  const [students, setStudents] = useState<ModuleStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");

  const [classroomPerformance, setClassroomPerformance] = useState<PerformanceClassroomDto | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  const [quizHistoryModal, setQuizHistoryModal] = useState<ModuleStudent | null>(null);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [loadingQuizHistory, setLoadingQuizHistory] = useState(false);

  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<ResetStudentPasswordData | null>(null);
  // SubjectTeachers don't get this — the endpoint 403s for them (a ClassTeacher
  // is further restricted server-side to students in their own classroom).
  const canResetPassword = user?.roleName === "ClassTeacher" || user?.roleName === "HeadTeacher";

  const handleResetPassword = async (studentId: string) => {
    setResettingPasswordId(studentId);
    try {
      const { data } = await adminService.resetStudentPassword(studentId);
      if (data.status === "failed") {
        toast.error(data.responseMessage || "Failed to generate a temporary password");
        return;
      }
      setResetPasswordResult(data.data);
    } catch (error: any) {
      const msg =
        error?.response?.data?.responseMessage ??
        error?.message ??
        "Failed to generate a temporary password";
      toast.error(msg);
    } finally {
      setResettingPasswordId(null);
    }
  };

  const roleData = user?.roleData;
  const classrooms: ClassroomInfo[] = roleData && isTeacherRoleData(roleData)
    ? roleData.classrooms.map((c) => ({
        classroomId: c.classroomId,
        className: c.className,
        subjects: c.subjects.map((s) => ({
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          subjectCategory: s.subjectCategory,
        })),
      }))
    : [];

  const selectedClassroom = classrooms.find((c) => c.classroomId === selectedClassroomId);
  const subjects = selectedClassroom?.subjects ?? [];

  useEffect(() => {
    if (classrooms.length > 0 && !selectedClassroomId) {
      setSelectedClassroomId(classrooms[0].classroomId);
    }
  }, [classrooms, selectedClassroomId]);

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectName) {
      setSelectedSubjectName(subjects[0].subjectName);
    }
  }, [subjects, selectedSubjectName]);

  useEffect(() => {
    const load = async () => {
      setLoadingStudents(true);
      try {
        const res = await moduleService.getTeacherStudents();
        const payload = (res.data as any)?.data ?? (res.data as any)?.Data ?? [];
        setStudents((Array.isArray(payload) ? payload : []).map(normalizeStudent).filter((s: ModuleStudent) => !!s.id));
      } catch { /* ignore */ } finally {
        setLoadingStudents(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) return;
    const load = async () => {
      setLoadingPerformance(true);
      try {
        const res = await performanceService.getClassroomPerformance(selectedClassroomId);
        const data = (res.data as any)?.data ?? [];
        const list = Array.isArray(data) ? data : [];
        const match = list.find((p: any) => p.classroomId === selectedClassroomId || p.classroomId === selectedClassroomId);
        setClassroomPerformance(match ?? null);
      } catch { setClassroomPerformance(null); } finally {
        setLoadingPerformance(false);
      }
    };
    load();
  }, [selectedClassroomId]);

  const filteredStudents = useMemo(() => {
    let list = students;

    if (selectedClassroom) {
      list = list.filter((s) => s.className === selectedClassroom.className);
    }

    if (selectedSubjectName) {
      list = list.filter((s) => getSubjectCategory(s, selectedSubjectName));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        [s.firstName, s.lastName, s.userName, s.emailAddress].join(" ").toLowerCase().includes(q)
      );
    }

    return list;
  }, [students, selectedClassroom, selectedSubjectName, search]);

  const handleViewQuizHistory = async (student: ModuleStudent) => {
    setQuizHistoryModal(student);
    setQuizHistory([]);
    setLoadingQuizHistory(true);
    try {
      const res = await quizService.getStudentQuizHistory(student.id);
      const data = (res.data as any)?.data ?? [];
      setQuizHistory(Array.isArray(data) ? data : []);
    } catch { setQuizHistory([]); } finally {
      setLoadingQuizHistory(false);
    }
  };

  const handleGoToSubjectQuiz = (subjectId: string) => {
    navigate(`/teacher/assessment/generate-quiz?subjectId=${subjectId}`);
  };

  const handleGoToAssessment = (classroomId: string, subjectId?: string) => {
    const path = subjectId
      ? `/teacher/assessment?classroomId=${classroomId}&subjectId=${subjectId}`
      : `/teacher/assessment?classroomId=${classroomId}`;
    navigate(path);
  };

  if (classrooms.length === 0) {
    return (
      <div className="font-poppins p-4 md:p-6">
        <div className="rounded-2xl border border-white/20 overflow-hidden bg-white/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#292382] to-[#3D36A8]">
            {openMobileNav && (
              <Menu className="lg:hidden text-white shrink-0 cursor-pointer" onClick={openMobileNav} />
            )}
            <School className="w-5 h-5 text-white/90 shrink-0" />
            <h1 className="text-white font-semibold text-sm sm:text-base">My Classroom</h1>
          </div>
          <div className="p-12 text-center">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No classrooms assigned yet.</p>
            <p className="text-slate-400 text-sm mt-1">Contact your administrator to be assigned to a classroom.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-poppins p-2 sm:p-4 md:p-6">
      <div className="rounded-2xl border border-white/20 overflow-hidden bg-white/80 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#292382] to-[#3D36A8]">
          <div className="flex items-center gap-3 min-w-0">
            {openMobileNav && (
              <Menu className="lg:hidden text-white shrink-0 cursor-pointer" onClick={openMobileNav} />
            )}
            <School className="w-5 h-5 hidden lg:inline text-white/90 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-sm sm:text-base truncate">My Classroom</h1>
              <p className="text-white/60 text-xs truncate hidden sm:block">
                {user?.roleName === "HeadTeacher" ? "Head teacher overview" : user?.roleName === "ClassTeacher" ? "Class teacher overview" : "Subject teacher overview"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 text-white text-xs font-medium">
            <Users className="w-4 h-4" />
            <span>{filteredStudents.length} Student{filteredStudents.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {classrooms.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {classrooms.map((c) => (
                <button
                  key={c.classroomId}
                  onClick={() => { setSelectedClassroomId(c.classroomId); setSelectedSubjectName(""); }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedClassroomId === c.classroomId
                      ? "bg-[#292382] text-white shadow-md"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-[#292382]/30"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 inline mr-1.5" />
                  {c.className}
                </button>
              ))}
            </div>
          )}

          {selectedClassroom && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-indigo-50 to-purple-50/50 rounded-xl px-4 py-3 border border-indigo-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#292382]/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-[#292382]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{selectedClassroom.className}</p>
                    <p className="text-xs text-slate-500">
                      {subjects.length} subject{subjects.length !== 1 ? "s" : ""} · {user?.roleName === "SubjectTeacher" ? "Subject access" : "Assigned subjects"}
                    </p>
                  </div>
                </div>

                {loadingPerformance ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading stats...
                  </div>
                ) : classroomPerformance ? (
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-slate-600">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                      Avg: <strong>{classroomPerformance.averageScorePercent.toFixed(0)}%</strong>
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Target className="w-3.5 h-3.5 text-blue-500" />
                      Pass: <strong>{classroomPerformance.passRate.toFixed(0)}%</strong>
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {classroomPerformance.totalAttempts} attempt{classroomPerformance.totalAttempts !== 1 ? "s" : ""}
                    </span>
                  </div>
                ) : null}
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mr-1 py-2">
                    <BookOpen className="w-3.5 h-3.5" /> Subjects:
                  </span>
                  {subjects.map((sub) => (
                    <button
                      key={sub.subjectId}
                      onClick={() => setSelectedSubjectName(sub.subjectName)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedSubjectName === sub.subjectName
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-amber-400/40 hover:bg-amber-50/50"
                      }`}
                    >
                      {sub.subjectName}
                    </button>
                  ))}
                </div>
              )}

              {selectedSubjectName && (
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200/50">
                  <button
                    onClick={() => {
                      const sub = subjects.find((s) => s.subjectName === selectedSubjectName);
                      if (sub) handleGoToSubjectQuiz(sub.subjectId);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <FileQuestion className="w-3.5 h-3.5" />
                    View Quizzes
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      const sub = subjects.find((s) => s.subjectName === selectedSubjectName);
                      handleGoToAssessment(selectedClassroom.classroomId, sub?.subjectId);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Assessments
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => navigate(`/teacher/assessment?classroomId=${selectedClassroom.classroomId}&subjectId=${subjects.find((s) => s.subjectName === selectedSubjectName)?.subjectId}`)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Question Bank
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students by name or email..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          {loadingStudents ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1.2fr] gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Student</span>
                <span>Email</span>
                <span>Class</span>
                <span>Actions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1.2fr] gap-2 md:gap-3 items-center px-4 py-3.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#292382] to-[#5C5FEF] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-slate-400 truncate md:hidden">
                          {student.className} · @{student.userName}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 truncate hidden md:block">{student.emailAddress || "-"}</p>
                    <p className="text-sm text-slate-600 truncate">{student.className || "-"}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleViewQuizHistory(student)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 transition-colors whitespace-nowrap"
                      >
                        <FileQuestion className="w-3 h-3" />
                        Quiz
                      </button>
                      <button
                        onClick={() => navigate(`/teacher/assessment?studentId=${student.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-colors whitespace-nowrap"
                      >
                        <ClipboardCheck className="w-3 h-3" />
                        Assessment
                      </button>
                      {canResetPassword && (
                        <button
                          onClick={() => handleResetPassword(student.id)}
                          disabled={resettingPasswordId === student.id}
                          title="Generate a temporary password for this student"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {resettingPasswordId === student.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <KeyRound className="w-3 h-3" />
                          )}
                          Reset PW
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="px-4 py-16 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No students found.</p>
                    <p className="text-xs text-slate-300 mt-1">Try adjusting your filters or search query.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {quizHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setQuizHistoryModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#292382] to-[#3D36A8] px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {quizHistoryModal.firstName[0]}{quizHistoryModal.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {quizHistoryModal.firstName} {quizHistoryModal.lastName}
                    </p>
                    <p className="text-white/60 text-xs truncate">{quizHistoryModal.className}</p>
                  </div>
                </div>
                <button
                  onClick={() => setQuizHistoryModal(null)}
                  className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Quiz History</p>

              {loadingQuizHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-[#292382] animate-spin" />
                </div>
              ) : quizHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FileQuestion className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No quiz attempts yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quizHistory.map((q: any, i: number) => (
                    <div
                      key={q.attemptId ?? i}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {q.lessonTitle ?? `Quiz #${i + 1}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          Attempt {q.attemptNumber} · {q.submittedAt ? new Date(q.submittedAt).toLocaleDateString() : "In progress"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span
                          className={`text-sm font-bold ${
                            q.finalScorePercent >= 50 ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {q.finalScorePercent?.toFixed(0) ?? "—"}%
                        </span>
                        {q.isPassed === true && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {q.isPassed === false && <XCircle className="w-4 h-4 text-red-500" />}
                        {q.isPassed == null && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ResetPasswordDialog data={resetPasswordResult} onClose={() => setResetPasswordResult(null)} />
    </div>
  );
};

export default MyClassroomPage;
