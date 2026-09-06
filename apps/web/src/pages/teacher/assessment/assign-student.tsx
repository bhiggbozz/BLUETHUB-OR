import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { assessmentService, type AssessmentDetail } from "@/services/assessment";
import { moduleService, type ModuleStudent } from "@/services/module";
import {
  ArrowLeft,
  Search,
  Loader2,
  Users,
  ClipboardCopy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Filter,
  School,
  Mail,
  CheckSquare,
  Square,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Label } from "@bluethub/ui-kit";

const AssignAssessmentToStudent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();

  const initialCode = searchParams.get("code") ?? "";

  // ── Assessment lookup ──────────────────────────────────────────────────────
  const [assessmentCodeInput, setAssessmentCodeInput] = useState(initialCode);
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  // ── Students ───────────────────────────────────────────────────────────────
  const [students, setStudents] = useState<ModuleStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [classFilter, setClassFilter] = useState<string>("all");

  // ── Assignment ─────────────────────────────────────────────────────────────
  const [assigning, setAssigning] = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load assessment automatically if code is in query params
  useEffect(() => {
    if (initialCode) {
      void loadAssessment(initialCode);
    }
  }, [initialCode]);

  // Load students on mount
  useEffect(() => {
    void loadStudents();
  }, []);

  const loadAssessment = async (code: string) => {
    setLoadingAssessment(true);
    setAssessmentError(null);
    try {
      const res = await assessmentService.getDetailByCode(code);
      const data = res.data?.data ?? null;
      if (data) {
        setAssessment(data);
      } else {
        setAssessmentError("Assessment not found.");
      }
    } catch {
      setAssessmentError("Failed to load assessment. Please check the code and try again.");
    } finally {
      setLoadingAssessment(false);
    }
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await moduleService.getTeacherStudents();
      const data = res.data?.data ?? [];
      setStudents(data);
    } catch {
      toast.error("Failed to load students.");
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      if (s.className && !map.has(s.className)) {
        map.set(s.className, s.className);
      }
    }
    return Array.from(map.values()).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    let list = students;

    if (classFilter !== "all") {
      list = list.filter((s) => s.className === classFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.userName.toLowerCase().includes(q) ||
          s.emailAddress.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q),
      );
    }

    return list;
  }, [students, classFilter, searchQuery]);

  const allSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudentIds.has(s.id));
  const someSelected = filteredStudents.some((s) => selectedStudentIds.has(s.id)) && !allSelected;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLookup = () => {
    if (!assessmentCodeInput.trim()) {
      toast.error("Enter an assessment code");
      return;
    }
    void loadAssessment(assessmentCodeInput.trim());
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        for (const s of filteredStudents) next.delete(s.id);
        return next;
      });
    } else {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        for (const s of filteredStudents) next.add(s.id);
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedStudentIds(new Set());

  const handleAssign = async () => {
    if (!assessment) {
      toast.error("No assessment loaded");
      return;
    }
    if (selectedStudentIds.size === 0) {
      toast.error("Select at least one student");
      return;
    }

    setAssigning(true);
    try {
      await assessmentService.assign({
        assessmentId: assessment.assessmentId,
        targetType: "Student",
        targetIds: Array.from(selectedStudentIds),
      });
      setAssignedCount(selectedStudentIds.size);
      setShowSuccess(true);
      setSelectedStudentIds(new Set());
      toast.success(`Assessment assigned to ${selectedStudentIds.size} student(s)`);
    } catch {
      toast.error("Failed to assign assessment. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleCopyCode = async () => {
    if (!assessment?.code) return;
    try {
      await navigator.clipboard.writeText(assessment.code);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Could not copy code");
    }
  };

  return (
    <div className="font-poppins min-h-screen">
      <div className="backdrop-blur-sm  border border-white/20 overflow-hidden bg-white/70">
        {/* Header */}
        <div className="bg-gradient-to-r from-chestnut to-chestnut/90 px-4 sm:px-6 py-4 sm:py-5  flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="lg:hidden">
              <button onClick={openMobileNav} className="text-white">
                {/* hamburger handled by parent layout, but icon shown here for consistency */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
            <button onClick={() => navigate(-1)} className="p-1.5 hidden sm:block">
              <ArrowLeft size={16} className="text-white" />
            </button>
            <h2 className="font-semibold text-base text-white leading-none">Assign Assessment</h2>
          </div>
          {selectedStudentIds.size > 0 && (
            <span className="text-xs font-semibold text-white bg-white/20 px-3 py-1.5 rounded-full">
              {selectedStudentIds.size} selected
            </span>
          )}
        </div>

        <div className="p-2 sm:px-2 max-w-5xl mx-auto space-y-6">
          {/* ── Assessment Lookup ────────────────────────────────────────────── */}
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-chestnut" />
              <span className="text-sm font-bold text-slate-800">Find Assessment</span>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Assessment Code
                  </Label>
                  <input
                    type="text"
                    value={assessmentCodeInput}
                    onChange={(e) => setAssessmentCodeInput(e.target.value)}
                    placeholder="Paste assessment code here (e.g. MID-MATH-2025)"
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleLookup}
                    disabled={loadingAssessment}
                    className="h-11 px-5 rounded-md bg-chestnut hover:bg-chestnut/90 text-white text-base font-medium transition-all disabled:opacity-50 flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    {loadingAssessment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {loadingAssessment ? "Loading…" : "Load"}
                  </button>
                </div>
              </div>

              {assessmentError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {assessmentError}
                </div>
              )}

              {assessment && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider">{assessment.code}</span>
                      <button
                        onClick={handleCopyCode}
                        className="text-indigo-400 hover:text-chestnut transition-colors"
                        title="Copy code"
                      >
                        <ClipboardCopy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 truncate">{assessment.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {assessment.questionCount} questions · {assessment.timeLimitMinutes} min · {assessment.totalMarks} marks · Pass {assessment.passMarkPercent}%
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-100">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready to assign
                    </span>
                    <button
                      onClick={() => {
                        setAssessment(null);
                        setAssessmentError(null);
                        setAssessmentCodeInput("");
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Student Selection ────────────────────────────────────────────── */}
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-chestnut" />
                <span className="text-sm font-bold text-slate-800">Select Students</span>
              </div>
              <div className="flex items-center gap-2">
                {filteredStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-slate-500 hover:text-chestnut transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-chestnut" />
                    ) : someSelected ? (
                      <CheckSquare className="w-4 h-4 text-chestnut/50" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                )}
                {selectedStudentIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs font-semibold text-red-500 hover:text-red-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, username, email or class…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut appearance-none cursor-pointer"
                  >
                    <option value="all">All Classes</option>
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => void loadStudents()}
                  disabled={loadingStudents}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStudents ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
              {filteredStudents.length > 0 && (
                <p className="text-xs text-slate-400">
                  Showing {filteredStudents.length} of {students.length} students
                </p>
              )}
            </div>

            {/* Student List */}
            <div className="divide-y divide-slate-100">
              {loadingStudents ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading students…</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-500">
                    {students.length === 0 ? "No students found" : "No students match your filter"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    {students.length === 0
                      ? "Students from your classrooms will appear here."
                      : "Try adjusting your search or class filter."}
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.has(student.id);
                  const initials = `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`.toUpperCase();

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className={`w-full text-left px-4 sm:px-5 py-3.5 transition-colors flex items-center gap-3 sm:gap-4 ${
                        isSelected ? "bg-chestnut/5" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="shrink-0 text-chestnut mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </span>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                        <span className="text-xs font-bold text-indigo-600">{initials || "—"}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-slate-400 truncate">@{student.userName}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <School className="w-3 h-3 text-slate-400" />
                            {student.className || "—"}
                          </span>
                          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                            <Mail className="w-3 h-3" />
                            {student.emailAddress}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Bottom Action Bar ────────────────────────────────────────────── */}
          <div className="sticky bottom-4 z-10">
            <div className="rounded-md border border-slate-200 bg-white shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {selectedStudentIds.size > 0 ? (
                    <>
                      {selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? "s" : ""} selected
                    </>
                  ) : (
                    <span className="text-slate-400">No students selected</span>
                  )}
                </p>
                {assessment && (
                  <p className="text-xs text-slate-500 truncate">
                    Assigning <span className="font-semibold text-slate-700">{assessment.title}</span>
                  </p>
                )}
              </div>
              <Button
                onClick={handleAssign}
                disabled={assigning || selectedStudentIds.size === 0 || !assessment}
                className="h-11 px-6 rounded-xl bg-chestnut hover:bg-chestnut/90 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                {assigning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {assigning ? "Assigning…" : `Assign Assessment`}
              </Button>
            </div>
          </div>

          {/* ── Empty spacer for scroll comfort ──────────────────────────────── */}
          <div className="h-4" />
        </div>
      </div>

      {/* ── Success Dialog ───────────────────────────────────────────────────── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff]">
              <h3 className="text-base font-semibold text-slate-800">Assignment Complete</h3>
            </div>
            <div className="p-5 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Assessment assigned successfully!
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {assignedCount} student{assignedCount !== 1 ? "s" : ""} will see this assessment in their list.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setShowSuccess(false)}
                  className="w-full h-10 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white font-semibold text-sm"
                >
                  Done
                </Button>
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setSelectedStudentIds(new Set());
                  }}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
                >
                  Assign to More Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignAssessmentToStudent;
