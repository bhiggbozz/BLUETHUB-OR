import { isStudentRoleData, useAuthContext, type Subject } from "@/contexts/auth-context";
import { performanceService, type StudentNavbarDto, type PerformanceAttemptDto } from "@/services/performance";
import {
  School,
  BookOpen,
  BarChart3,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  GraduationCap,
  Menu,
  Trophy,
  FileQuestion,
  LineChart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

const StudentMyClassroom = () => {
  const { user } = useAuthContext();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>() ?? {};

  const [navbarStats, setNavbarStats] = useState<StudentNavbarDto | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<PerformanceAttemptDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");

  const roleData = user?.roleData;
  const studentRoleData = roleData && isStudentRoleData(roleData) ? roleData : null;

  const allSubjects: Subject[] = [
    ...(studentRoleData?.majorSubjects ?? []),
    ...(studentRoleData?.minorSubjects ?? []),
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [navbarRes] = await Promise.all([
          performanceService.getNavbar(),
        ]);
        const navbarData = (navbarRes.data as any)?.data;
        if (navbarData) {
          setNavbarStats(navbarData as StudentNavbarDto);
        }
      } catch {
        /* ignore */
      }

      try {
        const dashRes = await performanceService.getDashboard();
        const dashData = (dashRes.data as any)?.data;
        if (dashData) {
          if (Array.isArray(dashData)) {
            const first = dashData[0];
            if (first?.recentAttempts) {
              setRecentAttempts(first.recentAttempts);
            }
          } else if (dashData?.recentAttempts) {
            setRecentAttempts(dashData.recentAttempts);
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (!studentRoleData) {
    return (
      <div className="font-poppins p-4 md:p-6">
        <div className="rounded-2xl border border-white/20 overflow-hidden bg-white/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#292382] to-[#3D36A8]">
            <School className="w-5 h-5 text-white/90 shrink-0" />
            <h1 className="text-white font-semibold text-sm sm:text-base">My Classroom</h1>
          </div>
          <div className="p-12 text-center">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No classroom assigned yet.</p>
            <p className="text-slate-400 text-sm mt-1">Contact your administrator to be assigned to a classroom.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-poppins ">
      <div className="md:rounded-2xl border border-white/20 overflow-hidden bg-white/80 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#292382] to-[#3D36A8]">
          <div className="flex items-center gap-3 min-w-0">
            {openMobileNav && (
              <Menu className="lg:hidden text-white shrink-0 cursor-pointer" onClick={openMobileNav} />
            )}
            <School className="w-5 h-5 hidden lg:inline text-white/90 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-sm sm:text-base truncate">My Classroom</h1>
              <p className="text-white/60 text-xs truncate hidden sm:block">Student overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 text-white text-xs font-medium">
            <BookOpen className="w-4 h-4" />
            <span>{allSubjects.length} Subject{allSubjects.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl px-4 py-3 border border-blue-200/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#292382] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {studentRoleData.classroom?.className ?? "No class"} · {studentRoleData.totalSubjects ?? allSubjects.length} subjects
                </p>
              </div>
            </div>
          </div>

          {allSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mr-1 py-2">
                <BookOpen className="w-3.5 h-3.5" /> Subjects:
              </span>
              <button
                onClick={() => setSelectedSubjectName("")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !selectedSubjectName
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-amber-400/40 hover:bg-amber-50/50"
                }`}
              >
                All
              </button>
              {allSubjects.map((sub) => (
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

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50/80 rounded-xl px-4 py-2.5 border border-slate-200/60">
            <BarChart3 className="w-4 h-4 text-[#292382]" />
            <span>
              {selectedSubjectName
                ? `Showing performance for ${selectedSubjectName}`
                : "Showing overall performance across all subjects"}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Target className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Avg Score</p>
                      <p className="text-lg font-bold text-slate-800">
                        {navbarStats?.averageScorePercent?.toFixed(0) ?? "—"}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Pass Rate</p>
                      <p className="text-lg font-bold text-slate-800">
                        {navbarStats?.passRate?.toFixed(0) ?? "—"}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Attempts</p>
                      <p className="text-lg font-bold text-slate-800">
                        {navbarStats?.completedAttempts ?? 0}/{navbarStats?.totalAttempts ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <FileQuestion className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Pending</p>
                      <p className="text-lg font-bold text-slate-800">
                        {navbarStats?.pendingQuizzes ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {recentAttempts.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Recent Quiz Attempts</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {recentAttempts.slice(0, 5).map((attempt, i) => (
                      <div
                        key={attempt.attemptId ?? i}
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {attempt.lessonTitle ?? `Quiz #${i + 1}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {attempt.subjectName} · Attempt {attempt.attemptNumber}
                            {attempt.submittedAt && ` · ${new Date(attempt.submittedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span
                            className={`text-sm font-bold ${
                              attempt.finalScorePercent >= 50 ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {attempt.finalScorePercent?.toFixed(0) ?? "—"}%
                          </span>
                          {attempt.isPassed === true && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {attempt.isPassed === false && <XCircle className="w-4 h-4 text-red-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Link
                  to="/student/my-course"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#292382] text-white text-xs font-semibold hover:bg-[#3D36A8] transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  My Courses
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <Link
                  to="/student/Quizzes"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:border-[#292382]/30 hover:bg-slate-50 transition-colors"
                >
                  <FileQuestion className="w-3.5 h-3.5" />
                  Quizzes
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <Link
                  to="/student/Grades-Progress"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:border-[#292382]/30 hover:bg-slate-50 transition-colors"
                >
                  <LineChart className="w-3.5 h-3.5" />
                  Grades & Progress
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentMyClassroom;
