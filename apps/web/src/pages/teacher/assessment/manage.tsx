import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  assessmentService,
  type TeacherAssessmentItem,
  type AssessmentAssignmentItem,
} from "@/services/assessment";
import {
  ArrowLeft,
  Search,
  Loader2,
  ClipboardCopy,
  Check,
  Clock,
  FileQuestion,
  Target,
  BookOpen,
  CalendarDays,
  Users,
  School,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const ManageAssessmentsPage = () => {
  const navigate = useNavigate();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();

  const [assessments, setAssessments] = useState<TeacherAssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // assignments per assessment
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, AssessmentAssignmentItem[]>>({});
  const [loadingAssignments, setLoadingAssignments] = useState<Record<string, boolean>>({});

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    void loadAssessments();
  }, []);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getTeacherList();
      const data = res.data?.data ?? [];
      setAssessments(data);
    } catch {
      toast.error("Failed to load assessments.");
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (assessmentId: string) => {
    if (assignmentsMap[assessmentId]) return; // already loaded
    setLoadingAssignments((prev) => ({ ...prev, [assessmentId]: true }));
    try {
      const res = await assessmentService.getAssignments(assessmentId);
      const raw = res.data?.data;
      const data = Array.isArray(raw) ? raw : [];
      setAssignmentsMap((prev) => ({ ...prev, [assessmentId]: data }));
    } catch {
      toast.error("Failed to load assignment details.");
    } finally {
      setLoadingAssignments((prev) => ({ ...prev, [assessmentId]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      void loadAssignments(id);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 2000);
    } catch {
      toast.error("Could not copy code");
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return assessments;
    const q = searchQuery.toLowerCase();
    return assessments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q),
    );
  }, [assessments, searchQuery]);

  return (
    <div className="font-poppins">
      <div className="backdrop-blur-sm  border border-white/20 overflow-hidden bg-white/70">
        {/* Header */}
        <div className="bg-gradient-to-r from-chestnut to-chestnut/90 px-4 sm:px-6 py-4 sm:py-5  flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={openMobileNav} className="lg:hidden text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button onClick={() => navigate(-1)} className="p-1.5 hidden sm:block">
              <ArrowLeft size={16} className="text-white" />
            </button>
            <h2 className="font-semibold text-base text-white leading-none">Manage Assessments</h2>
          </div>
          <button
            onClick={() => navigate("/teacher/assessment/config")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Create New
          </button>
        </div>

        <div className="p-4 sm:p-6 min-h-screen max-w-5xl mx-auto space-y-5">
          {/* Search + stats */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or code…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-md border border-slate-200 bg-white px-4 py-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">
                  Total: <span className="font-bold text-slate-800">{assessments.length}</span>
                </span>
              </div>
              <button
                onClick={() => void loadAssessments()}
                disabled={loading}
                className="h-10 px-4 rounded-md border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Loader2 className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading assessments…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <BookOpen className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">
                {assessments.length === 0 ? "No assessments yet" : "No assessments match your search"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {assessments.length === 0
                  ? "Create your first assessment to start assigning to students."
                  : "Try adjusting your search query."}
              </p>
              {assessments.length === 0 && (
                <button
                  onClick={() => navigate("/teacher/assessment/config")}
                  className="mt-4 h-10 px-5 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white text-sm font-semibold transition-colors"
                >
                  Create Assessment
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => {
                const isOpen = expandedId === a.assessmentId;
                const rawAssignments = assignmentsMap[a.assessmentId];
                const assignments = Array.isArray(rawAssignments) ? rawAssignments : [];
                const isLoadingAssignments = loadingAssignments[a.assessmentId];

                const studentAssignments = assignments.filter((x) => x.targetType === "Student");
                const classroomAssignments = assignments.filter((x) => x.targetType === "Classroom");
                const subjectAssignments = assignments.filter((x) => x.targetType === "Subject");

                return (
                  <div
                    key={a.assessmentId}
                    className="rounded-md border border-slate-200 bg-white overflow-hidden transition-all"
                  >
                    {/* Summary row */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(a.assessmentId)}
                      className="w-full text-left px-4 sm:px-5 py-4 flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-chestnut bg-chestnut/10 px-2 py-0.5 rounded-full">
                            {a.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              a.status === "Active"
                                ? "bg-emerald-50 text-emerald-600"
                                : a.status === "Expired"
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 mt-1 truncate">{a.title}</h3>
                        {a.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <FileQuestion className="w-3 h-3 text-slate-400" />
                            {a.questionCount} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {a.timeLimitMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3 text-slate-400" />
                            Pass {a.passMarkPercent}%
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-slate-400" />
                            {a.expiresAt
                              ? `Expires: ${new Date(a.expiresAt).toLocaleString()}`
                              : "No expiry"}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleCopyCode(a.code);
                          }}
                          className="text-slate-400 hover:text-chestnut transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === a.code ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <ClipboardCopy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/teacher/assessment/assign-student?code=${a.code}`);
                          }}
                          className="text-slate-400 hover:text-chestnut transition-colors"
                          title="Assign to students"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isOpen && (
                      <div className="border-t border-slate-100 px-4 sm:px-5 py-4 bg-slate-50/50 space-y-4">
                        {/* Config grid */}
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Configuration
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-md bg-white border border-slate-100 p-3 text-center">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Questions</p>
                              <p className="text-base font-bold text-slate-800">{a.questionCount}</p>
                            </div>
                            <div className="rounded-md bg-white border border-slate-100 p-3 text-center">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Marks</p>
                              <p className="text-base font-bold text-slate-800">{a.totalMarks}</p>
                            </div>
                            <div className="rounded-md bg-white border border-slate-100 p-3 text-center">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Shuffle</p>
                              <p className="text-base font-bold text-slate-800">{a.shuffleQuestions ? "Yes" : "No"}</p>
                            </div>
                            <div className="rounded-md bg-white border border-slate-100 p-3 text-center">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Show Result</p>
                              <p className="text-base font-bold text-slate-800">{a.showResultImmediately ? "Yes" : "No"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Assignments */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                              Assignments
                            </p>
                            {assignments.length > 0 && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                                {assignments.length} total
                              </span>
                            )}
                          </div>

                          {isLoadingAssignments ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading assignments…
                            </div>
                          ) : assignments.length === 0 ? (
                            <div className="rounded-md border border-slate-200 bg-white p-4 flex items-center gap-3">
                              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-slate-700">Not assigned yet</p>
                                <p className="text-xs text-slate-400">Share the code or assign directly to students, subjects, or classrooms.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {classroomAssignments.length > 0 && (
                                <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                                  <div className="px-4 py-2.5 bg-indigo-50/50 border-b border-slate-100 flex items-center gap-2">
                                    <School className="w-4 h-4 text-indigo-500" />
                                    <p className="text-xs font-semibold text-indigo-700">Classrooms ({classroomAssignments.length})</p>
                                  </div>
                                  <div className="divide-y divide-slate-100">
                                    {classroomAssignments.map((asg) => (
                                      <div key={asg.assignmentId} className="px-4 py-2 flex items-center justify-between">
                                        <p className="text-sm text-slate-700">{asg.targetName}</p>
                                        <p className="text-[10px] text-slate-400">{new Date(asg.assignedAt).toLocaleDateString()}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {subjectAssignments.length > 0 && (
                                <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                                  <div className="px-4 py-2.5 bg-emerald-50/50 border-b border-slate-100 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-emerald-500" />
                                    <p className="text-xs font-semibold text-emerald-700">Subjects ({subjectAssignments.length})</p>
                                  </div>
                                  <div className="divide-y divide-slate-100">
                                    {subjectAssignments.map((asg) => (
                                      <div key={asg.assignmentId} className="px-4 py-2 flex items-center justify-between">
                                        <p className="text-sm text-slate-700">{asg.targetName}</p>
                                        <p className="text-[10px] text-slate-400">{new Date(asg.assignedAt).toLocaleDateString()}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {studentAssignments.length > 0 && (
                                <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                                  <div className="px-4 py-2.5 bg-amber-50/50 border-b border-slate-100 flex items-center gap-2">
                                    <User className="w-4 h-4 text-amber-500" />
                                    <p className="text-xs font-semibold text-amber-700">Students ({studentAssignments.length})</p>
                                  </div>
                                  <div className="divide-y divide-slate-100">
                                    {studentAssignments.map((asg) => (
                                      <div key={asg.assignmentId} className="px-4 py-2 flex items-center justify-between">
                                        <p className="text-sm text-slate-700">{asg.targetName}</p>
                                        <p className="text-[10px] text-slate-400">{new Date(asg.assignedAt).toLocaleDateString()}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => navigate(`/teacher/assessment/assign-student?assessmentId=${a.assessmentId}&code=${a.code}`)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-chestnut px-4 py-2 text-xs font-semibold text-white hover:bg-chestnut/90 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Assign to Students
                          </button>
                          <button
                            onClick={() => {
                              const el = document.getElementById(`code-${a.assessmentId}`);
                              if (el) {
                                void navigator.clipboard.writeText(a.code);
                                toast.success("Code copied");
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Copy Code
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageAssessmentsPage;
