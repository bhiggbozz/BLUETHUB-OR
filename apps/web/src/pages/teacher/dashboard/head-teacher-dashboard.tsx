import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Menu, Users, BarChart3, ClipboardCheck, RefreshCw, Loader2, ChevronRight, CheckCircle2, School, Trophy, Eye, BookOpen, GraduationCap, Plus, Library } from "lucide-react";
import { performanceService, type TeacherPerformanceDashboardDto, type PerformanceClassroomDto } from "@/services/performance";
import { type ApprovalItemDto } from "@/services/lesson";
import { approvalService, getApprovalDisplay } from "@/services/approval";
import { useAuthContext, isTeacherRoleData } from "@/contexts/auth-context";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const scoreColor = (val: number | null | undefined) => {
  if (val == null) return "text-gray-400";
  return val >= 50 ? "text-green-600" : "text-red-600";
};

const fmtScore = (val: number | null | undefined) => {
  if (val == null || isNaN(val)) return "---";
  return `${Math.round(val)}%`;
};

interface ClassroomAnalytics {
  classroomId: string;
  className: string;
  subjects: PerformanceClassroomDto[];
  avgScore: number;
  passRate: number;
  totalStudents: number;
  totalAttempts: number;
}

const buildClassroomAnalytics = (dashboard: TeacherPerformanceDashboardDto): ClassroomAnalytics[] => {
  const map = new Map<string, PerformanceClassroomDto[]>();
  for (const c of dashboard.classrooms ?? []) {
    const key = c.classroomId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return Array.from(map.entries()).map(([id, subjects]) => {
    const totalStudents = Math.max(...subjects.map((s) => s.studentCount));
    const totalAttempts = subjects.reduce((a, s) => a + (s.totalAttempts ?? 0), 0);
    const avgScore = subjects.reduce((a, s) => a + (s.averageScorePercent ?? 0), 0) / subjects.length;
    const passRate = subjects.reduce((a, s) => a + (s.passRate ?? 0), 0) / subjects.length;
    return {
      classroomId: id,
      className: subjects[0]?.classroomName ?? "Unknown",
      subjects,
      avgScore,
      passRate,
      totalStudents,
      totalAttempts,
    };
  });
};

const ClassroomSection = ({ analytics }: { analytics: ClassroomAnalytics }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 overflow-hidden">
    <div className="bg-gradient-to-r from-[#292382] to-[#3D36A8] px-3 sm:px-4 py-3">
      <div className="flex items-center justify-between gap-2 px-3">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2">
            <School className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{analytics.className}</span>
          </h3>
          <p className="text-[10px] sm:text-xs text-blue-200 mt-0.5">
            {analytics.totalStudents} students · {analytics.subjects.length} subjects · {analytics.totalAttempts} attempts
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] sm:text-[10px] text-blue-200 uppercase tracking-wide">Avg Score</p>
          <p className={`text-base sm:text-lg font-bold ${analytics.avgScore >= 50 ? "text-green-300" : "text-red-300"}`}>
            {fmtScore(analytics.avgScore)}
          </p>
        </div>
      </div>
    </div>

    <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
        <MiniStat label="Students" value={analytics.totalStudents} icon={<Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />} color="text-blue-600" bg="bg-blue-50" />
        <MiniStat label="Avg Score" value={fmtScore(analytics.avgScore)} icon={<BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />} color={scoreColor(analytics.avgScore)} bg={analytics.avgScore >= 50 ? "bg-green-50" : "bg-red-50"} />
        <MiniStat label="Pass Rate" value={fmtScore(analytics.passRate)} icon={<Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />} color={scoreColor(analytics.passRate)} bg={analytics.passRate >= 50 ? "bg-green-50" : "bg-red-50"} />
        <MiniStat label="Attempts" value={analytics.totalAttempts} icon={<BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />} color="text-purple-600" bg="bg-purple-50" />
      </div>

      <div className="space-y-1.5">
        <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Subject Breakdown</p>
        {analytics.subjects.map((subj) => (
          <SubjectRow key={subj.subjectId} subj={subj} />
        ))}
      </div>
    </div>
  </div>
);

const MiniStat = ({ label, value, icon, color, bg }: { label: string; value: string | number; icon: React.ReactNode; color: string; bg: string }) => (
  <div className={`${bg} rounded-lg p-2 sm:p-2.5 text-center`}>
    <div className={`flex justify-center mb-0.5 sm:mb-1 ${color}`}>{icon}</div>
    <p className={`text-xs sm:text-sm font-bold ${color}`}>{value}</p>
    <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium">{label}</p>
  </div>
);

const SubjectRow = ({ subj }: { subj: PerformanceClassroomDto }) => {
  const [open, setOpen] = useState(false);
  const qb = subj.quizBreakdown ?? [];

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 sm:py-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#292382] shrink-0" />
          <span className="text-[11px] sm:text-xs font-semibold text-gray-800 truncate">{subj.subjectName}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
          <span className="text-[9px] sm:text-[10px] text-gray-400">{subj.completedAttempts}/{subj.totalAttempts}</span>
          <span className={`text-[11px] sm:text-xs font-bold ${scoreColor(subj.averageScorePercent)}`}>{fmtScore(subj.averageScorePercent)}</span>
          <ChevronRight className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-50 bg-gray-50/50 px-2.5 sm:px-3 py-2.5 sm:py-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-wide">Pass Rate</p>
              <p className={`text-[11px] sm:text-xs font-bold ${scoreColor(subj.passRate)}`}>{fmtScore(subj.passRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-wide">Students</p>
              <p className="text-[11px] sm:text-xs font-bold text-gray-800">{subj.studentCount}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-wide">Last Activity</p>
              <p className="text-[11px] sm:text-xs font-bold text-gray-800">
                {subj.lastActivityDate ? new Date(subj.lastActivityDate).toLocaleDateString() : "---"}
              </p>
            </div>
          </div>

          {qb.length > 0 && (
            <div className="border-t border-gray-200 pt-2 space-y-1">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Recent Quizzes</p>
              {qb.map((q) => (
                <div key={q.quizCode} className="flex items-center justify-between text-[10px] sm:text-[11px] pl-0.5 sm:pl-1">
                  <span className="text-gray-600 truncate lg:w-[400px]">{q.lessonTitle}</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                    <span className="text-gray-400">{q.attemptCount} attempts</span>
                    <span className={`font-semibold ${scoreColor(q.averageScore)}`}>{fmtScore(q.averageScore)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {qb.length === 0 && (
            <p className="text-[9px] sm:text-[10px] text-gray-400 text-center">No quiz data yet</p>
          )}
        </div>
      )}
    </div>
  );
};

const HeadTeacherDashboard = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const assignedClassrooms = useMemo(() => {
    const rd = user?.roleData;
    if (rd && isTeacherRoleData(rd)) {
      return rd.classrooms.map((c) => ({ classroomId: c.classroomId, className: c.className }));
    }
    return [];
  }, [user]);

  const [dashboard, setDashboard] = useState<TeacherPerformanceDashboardDto | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItemDto[]>([]);
  const [navbar, setNavbar] = useState<{ pendingApprovalsCount?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [navRes, dashRes, apprRes] = await Promise.all([
        performanceService.getNavbar(),
        performanceService.getDashboard(),
        approvalService.getPendingApprovals(),
      ]);
      const navData = (navRes.data as any)?.data;
      setNavbar(navData ?? null);
      const dashData = (dashRes.data as any)?.data;
      setDashboard(dashData as TeacherPerformanceDashboardDto);
      const apprData = (apprRes.data as any)?.data;
      setApprovals(apprData?.items ?? []);
    } catch {
      toast.error("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await performanceService.refreshPerformance();
      toast.success("Performance data refreshed");
      await fetchAll();
    } catch {
      toast.error("Failed to refresh performance data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleApproval = async (id: string, approved: boolean) => {
    try {
      await approvalService.respondToApproval(id, { approved, rejectionReason: approved ? undefined : "Rejected by Head Teacher" });
      toast.success(approved ? "Approved" : "Rejected");
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Failed to respond to approval");
    }
  };

  const classroomAnalytics = useMemo(() => {
    if (!dashboard) return [];

    const all = buildClassroomAnalytics(dashboard);

    if (assignedClassrooms.length === 0) return all;

    const assignedIds = new Set(assignedClassrooms.map((c) => c.classroomId));
    return all.filter((ca) => assignedIds.has(ca.classroomId));
  }, [dashboard, assignedClassrooms]);

  const pendingCount = navbar?.pendingApprovalsCount ?? dashboard?.pendingApprovalsCount ?? approvals.filter((a) => a.status === "Pending").length;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
        {/* Mobile header */}
        <div className="flex lg:hidden items-center justify-between px-1 py-2">
          <div className="flex gap-2 items-center">
            <Menu className="text-[#292382]" onClick={openMobileNav} />
            <span className="text-[#292382] font-semibold text-sm">Head Teacher Dashboard</span>
          </div>
        </div>

        {/* Assigned classrooms indicator */}
        {/* ── Classrooms bar ────────────────────────────────────── */}
        {assignedClassrooms.length > 0 ? (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100">
            <School className="w-3.5 h-3.5 text-[#292382] shrink-0" />
            <span className="text-[11px] text-gray-400 font-medium shrink-0">Classrooms:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {assignedClassrooms.map((c) => (
                <span
                  key={c.classroomId}
                  className="text-[11px] bg-[#292382]/8 text-[#292382] font-semibold px-2.5 py-0.5 rounded-full border border-[#292382]/10"
                >
                  {c.className}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-700 font-medium">
              No classrooms assigned —{" "}
              <span className="underline cursor-pointer">contact your administrator</span>
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#292382]" />
            <span className="text-sm text-gray-400">Loading dashboard...</span>
          </div>
        ) : (
          <>
            {/* Header + Refresh */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-100">

              {/* Left — identity */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#292382]/10 flex items-center justify-center shrink-0">
                  <School className="w-4.5 h-4.5 text-[#292382]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-[#292382] leading-tight truncate">
                    {dashboard?.teacherName} Dashboard
                  </h1>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate hidden md:block">
                    {dashboard?.teacherName
                      ? `Welcome back, ${user?.firstName} ${user?.lastName}`
                      : "Class performance at a glance"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate md:hidden">
                    {dashboard?.teacherName
                      ? `${user?.firstName} ${user?.lastName}`
                      : "Class performance at a glance"}
                  </p>
                </div>
              </div>

              {/* Right — actions */}
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {/* Question Bank */}
                <button
                  type="button"
                  onClick={() => navigate("/teacher/assessment/view-questions")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#292382] bg-white border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50 hover:border-[#292382]/30 transition-all"
                >
                  <Library className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Question Bank</span>
                </button>

                {/* Submit Lesson */}
                <button
                  type="button"
                  onClick={() => navigate("/teacher/submit-lesson")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#292382] rounded-md px-3 py-2 hover:bg-[#3D36A8] active:bg-[#1E1868] transition-all shadow-sm shadow-[#292382]/20"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Submit Lesson</span>
                </button>

                {/* Refresh */}
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-400 hover:text-[#292382] hover:border-[#292382]/30 hover:bg-gray-50 transition-all disabled:opacity-40"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#292382]" : ""}`} />
                </button>
              </div>
            </div>

            {/* Pending approvals notification banner */}
            {pendingCount > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-amber-800">
                      {pendingCount} item{pendingCount !== 1 ? "s" : ""} awaiting your approval
                    </p>
                    <p className="text-[10px] sm:text-xs text-amber-600 truncate">
                      Lessons, study groups, and other submissions from your students and teachers
                    </p>
                  </div>
                </div>
                <a
                  href="#pending-approvals"
                  className="shrink-0 text-[10px] sm:text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 px-3 py-1.5 sm:py-2 rounded-lg transition-colors"
                >
                  Review
                </a>
              </div>
            )}

            {/* Global stat cards */}
            {dashboard && classroomAnalytics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {[
                  { label: "Assigned Classes", value: assignedClassrooms.length, icon: School, color: "from-blue-500 to-blue-600" },
                  { label: "Total Students", value: classroomAnalytics.reduce((a, c) => a + c.totalStudents, 0), icon: Users, color: "from-purple-500 to-purple-600" },
                  { label: "Overall Avg", value: fmtScore(classroomAnalytics.reduce((a, c) => a + c.avgScore, 0) / classroomAnalytics.length), icon: BarChart3, color: "from-green-500 to-green-600" },
                  { label: "Pending Approvals", value: pendingCount, icon: ClipboardCheck, color: "from-amber-500 to-amber-600" },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200/60 p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shrink-0`}>
                      <card.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
                      <p className="text-base sm:text-lg font-bold text-[#292382]">{card.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Main grid */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
              {/* Left: Per-classroom analytics */}
              <div className="flex-1 space-y-3 sm:space-y-4">
                <h2 className="text-sm sm:text-base font-bold text-[#292382] flex items-center gap-2 px-1">
                  <BarChart3 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  Classroom Analytics
                </h2>

                {classroomAnalytics.length === 0 && dashboard && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 p-6 sm:p-8 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 font-medium">No performance data for your assigned classrooms.</p>
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4">
                  {classroomAnalytics.map((ca) => (
                    <ClassroomSection key={ca.classroomId} analytics={ca} />
                  ))}
                </div>
              </div>

              {/* Right: Pending Approvals */}
              <div id="pending-approvals" className="lg:w-[300px] xl:w-[340px] shrink-0 space-y-3 sm:space-y-4">
                <h2 className="text-sm sm:text-base font-bold text-[#292382] flex items-center gap-2 px-1">
                  <ClipboardCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  Pending Approvals
                  {pendingCount > 0 && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                  )}
                </h2>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 overflow-hidden">
                  {approvals.length === 0 && (
                    <div className="p-6 sm:p-8 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 font-medium">No pending approvals</p>
                    </div>
                  )}

                  <div className="divide-y divide-gray-100">
                    {approvals.map((a) => {
                      const display = getApprovalDisplay(a as any);
                      return (
                      <div key={a.id} className="p-3 sm:p-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs sm:text-sm font-semibold text-[#292382] truncate">{a.requestedByName}</p>
                              {a.operationType === "CreateGroup" && (
                                <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">Study Group</span>
                              )}
                              {a.operationType === "SubmitGroupContent" && (
                                <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">Group Content</span>
                              )}
                            </div>
                            {(display.subjectName ?? a.lesson?.subjectName) && (
                              <p className="text-[10px] sm:text-[11px] text-gray-500">
                                {display.subjectName ?? a.lesson?.subjectName}
                                {(display.className ?? a.lesson?.className) ? ` · ${display.className ?? a.lesson?.className}` : ""}
                              </p>
                            )}
                            <p className="text-[11px] sm:text-xs text-gray-600 mt-1 line-clamp-2">
                              {display.title}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 sm:mt-1">
                              {new Date(a.createdAt).toLocaleDateString()} · {a.status}
                            </p>
                            {a.status === "Pending" && (
                              <div className="flex items-center gap-2 mt-2 sm:mt-3">
                                <button
                                  type="button"
                                  onClick={() => handleApproval(a.id, true)}
                                  className="flex-1 text-[10px] sm:text-xs font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-lg py-1.5 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproval(a.id, false)}
                                  className="flex-1 text-[10px] sm:text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg py-1.5 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {a.status !== "Pending" && (
                              <span className={`inline-block text-[9px] sm:text-[10px] font-semibold mt-1.5 sm:mt-2 px-2 py-0.5 rounded-full ${a.status === "Approved" ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
                                }`}>
                                {a.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HeadTeacherDashboard;
