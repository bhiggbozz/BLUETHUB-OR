import { schoolService } from "@/services/school";
import { quizService, type SubjectQuizPerformanceDto } from "@/services/quiz";
import { Loader2, FileText, Users, CheckCircle2, XCircle, Clock, TrendingUp, BarChart3, BookOpen, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

interface ClassroomInfo {
  classroomId: string;
  className: string;
}

interface SubjectInfo {
  subjectId: string;
  subjectName: string;
}

const QuizBySubject = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [quizzes, setQuizzes] = useState<SubjectQuizPerformanceDto[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  useEffect(() => {
    setLoadingClassrooms(true);
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
      .catch(() => setClassrooms([]))
      .finally(() => setLoadingClassrooms(false));
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) return;
    schoolService.getSubjectsByClassroomId(selectedClassroomId)
      .then((res) => {
        const obj = (res.data as any)?.data ?? {};
        const major: any[] = obj.majorSubjects ?? obj.MajorSubjects ?? [];
        const minor: any[] = obj.minorSubjects ?? obj.MinorSubjects ?? [];
        const all = [...major, ...minor];
        const mapped: SubjectInfo[] = all.map((s: any) => ({
          subjectId: String(s.id ?? s.subjectId ?? ""),
          subjectName: String(s.subject ?? s.subjectName ?? s.name ?? ""),
        })).filter((s) => !!s.subjectId);
        setSubjects(mapped);
        setSelectedSubjectId("");
        setQuizzes([]);
      })
      .catch(() => { setSubjects([]); setQuizzes([]); });
  }, [selectedClassroomId]);

  useEffect(() => {
    if (!selectedSubjectId) return;
    setLoadingQuizzes(true);
    quizService.getSubjectQuizPerformance(selectedSubjectId)
      .then((res) => {
        const data = (res.data as any)?.data ?? [];
        setQuizzes(Array.isArray(data) ? data : []);
      })
      .catch(() => setQuizzes([]))
      .finally(() => setLoadingQuizzes(false));
  }, [selectedSubjectId]);

  const fmtPercent = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return "---";
    return `${Math.round(val)}%`;
  };

  const scoreColor = (val: number | null | undefined) => {
    if (val == null) return "text-gray-400";
    return val >= 50 ? "text-green-600" : "text-red-600";
  };

  const selectedSubjectName = subjects.find((s) => s.subjectId === selectedSubjectId)?.subjectName ?? "";

  if (loadingClassrooms) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#292382]" />
          <span className="text-sm text-gray-400">Loading classrooms...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6">
         <div className="flex items-start gap-3">
            <Menu
              className="lg:hidden text-chestnut mt-1 shrink-0 cursor-pointer"
              onClick={openMobileNav}
            />
            <div>
          <h1 className="text-lg sm:text-2xl font-bold text-[#292382]">Quiz by Subject</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Select a class and subject to view quiz performance across its lessons
          </p>
            </div>
          </div>
       
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
            <div className="flex-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full mt-1 text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-[#292382] font-medium focus:outline-none focus:ring-2 focus:ring-[#292382]/20 focus:border-transparent appearance-none"
              >
                {subjects.length === 0 && <option value="">No subjects</option>}
                {subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!selectedSubjectId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Select a subject to view quiz performance</p>
          </div>
        )}

        {selectedSubjectId && loadingQuizzes && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#292382]" />
            <span className="text-sm text-gray-400">Loading quiz performance...</span>
          </div>
        )}

        {selectedSubjectId && !loadingQuizzes && quizzes.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400 font-medium">No quizzes found for <span className="text-[#292382]">{selectedSubjectName}</span> yet.</p>
          </div>
        )}

        {selectedSubjectId && !loadingQuizzes && quizzes.length > 0 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-[#292382]" />
                <span className="text-sm font-semibold text-[#292382]">{selectedSubjectName}</span>
              </div>
              <p className="text-xs text-gray-400">{quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} found</p>
            </div>

            {quizzes.map((q) => (
              <div key={q.lessonId} className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-[#292382] truncate">{q.lessonTitle}</h3>
                      {q.classroomName && <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{q.classroomName}</p>}
                      <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{q.quizCode}</p>
                    </div>
                    <div className={`text-sm font-bold shrink-0 ${scoreColor(q.averageScorePercent)}`}>
                      {fmtPercent(q.averageScorePercent)}
                    </div>
                  </div>
                </div>

                {q.totalAttempts === 0 ? (
                  <div className="p-6 sm:p-8 text-center">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">No attempts yet</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100">
                    <div className="bg-white p-3 sm:p-4 text-center">
                        <Users className="w-4 h-4 mx-auto mb-1 text-[#292382]" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Students</p>
                        <p className="text-base sm:text-lg font-bold text-[#292382]">{q.totalStudents}</p>
                      </div>
                      <div className="bg-white p-3 sm:p-4 text-center">
                        <TrendingUp className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Attempts</p>
                        <p className="text-base sm:text-lg font-bold text-blue-600">
                          {q.completedAttempts}
                          <span className="text-xs text-gray-400 font-normal">/{q.totalAttempts}</span>
                        </p>
                      </div>
                      <div className="bg-white p-3 sm:p-4 text-center">
                        <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-green-500" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Passed</p>
                        <p className="text-base sm:text-lg font-bold text-green-600">{q.passedCount}</p>
                      </div>
                      <div className="bg-white p-3 sm:p-4 text-center">
                        <XCircle className="w-4 h-4 mx-auto mb-1 text-red-500" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Failed</p>
                        <p className="text-base sm:text-lg font-bold text-red-600">{q.failedCount}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-gray-100">
                      <div className="bg-white p-3 sm:p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 rounded-full bg-gray-200 flex-1 max-w-[160px] overflow-hidden">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(q.passRate ?? 0, 100)}%` }} />
                          </div>
                          <span className={`text-sm font-bold ${scoreColor(q.passRate)}`}>{fmtPercent(q.passRate)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">Pass Rate</p>
                      </div>
                      <div className="bg-white p-3 sm:p-4 text-center">
                        <Clock className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">In Progress</p>
                        <p className="text-base sm:text-lg font-bold text-amber-600">{q.inProgressAttempts}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizBySubject;