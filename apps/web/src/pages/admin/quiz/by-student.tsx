import { moduleService, type ModuleStudent } from "@/services/module";
import { schoolService } from "@/services/school";
import { quizService, type StudentQuizPerformanceDto } from "@/services/quiz";
import { Loader2, ChevronDown, ChevronRight, Search, Trophy, CheckCircle2, XCircle, Users, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

interface ClassroomInfo {
  classroomId: string;
  className: string;
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
  isActive: s?.isActive ?? s?.IsActive ?? true,
});

const QuizByStudent = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [students, setStudents] = useState<ModuleStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [performanceRecords, setPerformanceRecords] = useState<Map<string, StudentQuizPerformanceDto>>(new Map());

  useEffect(() => {
    schoolService.getAllClassRooms({ pageNumber: 1, pageSize: 200 })
      .then((res) => {
        const d = (res.data as any)?.data ?? {};
        const rows: any[] = d.classrooms ?? d.Classrooms ?? [];
        const mapped = rows.map((c: any) => ({
          classroomId: String(c.id ?? c.Id ?? c.classroomId ?? ""),
          className: String(c.name ?? c.Name ?? c.className ?? ""),
        })).filter((c: ClassroomInfo) => !!c.classroomId);
        setClassrooms(mapped);
        if (mapped.length > 0) setSelectedClassroomId(mapped[0].classroomId);
      })
      .catch(() => setClassrooms([]));
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) return;
    setLoadingStudents(true);
    setExpandedStudentId(null);
    moduleService.getStudentsByClassroom(selectedClassroomId)
      .then((res) => {
        const data = ((res.data as any)?.data ?? []);
        const normalized = (Array.isArray(data) ? data : []).map(normalizeStudent);
        setStudents(normalized);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [selectedClassroomId]);

  const fetchStudentPerformance = async (studentId: string) => {
    if (performanceRecords.has(studentId)) {
      setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
      return;
    }
    try {
      const res = await quizService.getStudentQuizPerformance(studentId);
      const data = (res.data as any)?.data as StudentQuizPerformanceDto | undefined;
      setPerformanceRecords((prev) => new Map(prev).set(studentId, data ?? ({} as StudentQuizPerformanceDto)));
    } catch {
      setPerformanceRecords((prev) => new Map(prev).set(studentId, {} as StudentQuizPerformanceDto));
    }
    setExpandedStudentId(studentId);
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.firstName, s.lastName, s.userName, s.emailAddress].join(" ").toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const fmtScore = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return "---";
    return `${Math.round(val)}%`;
  };

  const scoreColor = (val: number | null | undefined) => {
    if (val == null) return "text-gray-400";
    return val >= 50 ? "text-green-600" : "text-red-600";
  };

  const selectedClassName = classrooms.find((c) => c.classroomId === selectedClassroomId)?.className ?? "";

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6">
 <div className="flex items-start gap-3">
            <Menu
              className="lg:hidden text-chestnut mt-1 shrink-0 cursor-pointer"
              onClick={openMobileNav}
            />
            <div>
                      <h1 className="text-lg sm:text-2xl font-bold text-[#292382]">Quiz by Student</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Select a class to view and search students&apos; quiz performance</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Class</label>
              <select
                value={selectedClassroomId}
                onChange={(e) => { setSelectedClassroomId(e.target.value); setStudentSearch(""); }}
                className="w-full mt-1 text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-[#292382] font-medium focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent appearance-none"
              >
                {classrooms.map((c) => (
                  <option key={c.classroomId} value={c.classroomId}>{c.className}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loadingStudents && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#292382]" />
            <span className="text-sm text-gray-400">Loading students...</span>
          </div>
        )}

        {!loadingStudents && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students by name, username or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent"
                />
              </div>
            </div>

            <div className="px-4 sm:px-5 py-2.5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-[#292382]">{filteredStudents.length}</span> student{filteredStudents.length !== 1 ? "s" : ""}
                {studentSearch && ` matching "${studentSearch}"`}
              </p>
              <p className="text-xs text-gray-400">{selectedClassName}</p>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredStudents.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">
                    {studentSearch ? "No students match your search." : "No students in this class."}
                  </p>
                </div>
              )}
              {filteredStudents.map((student) => {
                const isOpen = expandedStudentId === student.id;
                const record = performanceRecords.get(student.id);
                const hasData = !!record?.studentId;

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
                        {record && hasData && (
                          <span className={`text-sm font-bold ${scoreColor(record.averageScorePercent)}`}>
                            {fmtScore(record.averageScorePercent)}
                          </span>
                        )}
                        {record && hasData && (record.bestScorePercent ?? 0) > 0 && (
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
                        {!hasData || (record?.totalAttempts ?? 0) === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">No quiz attempts yet.</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-white rounded-xl border border-gray-200/80 p-3 text-center">
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Avg</p>
                                <p className={`text-base font-bold ${scoreColor(record?.averageScorePercent)}`}>{fmtScore(record?.averageScorePercent)}</p>
                              </div>
                              <div className="bg-white rounded-xl border border-gray-200/80 p-3 text-center">
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Best</p>
                                <p className={`text-base font-bold ${(record?.bestScorePercent ?? 0) >= 50 ? "text-green-600" : "text-red-600"}`}>{fmtScore(record?.bestScorePercent)}</p>
                              </div>
                              <div className="bg-white rounded-xl border border-gray-200/80 p-3 text-center">
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Pass</p>
                                <p className={`text-base font-bold ${scoreColor(record?.passRate)}`}>{fmtScore(record?.passRate)}</p>
                              </div>
                              <div className="bg-white rounded-xl border border-gray-200/80 p-3 text-center">
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Done</p>
                                <p className="text-base font-bold text-[#292382]">{record?.completedAttempts ?? 0}/{record?.totalAttempts ?? 0}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {(record?.quizzes ?? []).map((q, i) => (
                                <div key={q.attemptId || q.lessonId || i} className="bg-white rounded-xl border border-gray-200/80 p-3.5 sm:p-4 flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[#292382] truncate">{q.lessonTitle || `Quiz ${q.quizCode}`}</p>
                                    <p className="text-[11px] text-gray-500">
                                      {q.subjectName}{q.classroomName ? ` · ${q.classroomName}` : ""}
                                      {q.latestSubmittedAt ? ` · ${new Date(q.latestSubmittedAt).toLocaleDateString()}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {q.attemptCount > 1 && (
                                      <span className="text-xs text-gray-400">{q.attemptCount}x</span>
                                    )}
                                    <span className={`text-sm font-bold ${(q.bestScorePercent ?? 0) >= 50 ? "text-green-600" : "text-red-600"}`}>
                                      {fmtScore(q.bestScorePercent)}
                                    </span>
                                    {q.isPassed === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                    {q.isPassed === false && <XCircle className="w-4 h-4 text-red-500" />}
                                    {q.isPassed == null && (
                                      <span className="text-[11px] text-amber-600 font-medium">{q.latestStatus || "Pending"}</span>
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
      </div>
    </div>
  );
};

export default QuizByStudent;