import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { assessmentService, type TeacherAssessmentItem } from "@/services/assessment";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  FileQuestion,
  Loader2,
  Search,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import AssessmentAnalyticsModal from "./assessment-analytics-modal";

/**
 * Exam Focus — pick an assessment (WAEC-style or any other) and see exactly
 * which questions the class is weak on, via per-question pass rate. This is
 * the same analytics view reachable by clicking a code on Manage Assessments;
 * this page exists as a dedicated, analytics-first entry point instead of
 * requiring the teacher to go through assessment management first.
 */
const ExamFocusPage = () => {
  const navigate = useNavigate();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();

  const [assessments, setAssessments] = useState<TeacherAssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [analyticsAssessmentId, setAnalyticsAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    void loadAssessments();
  }, []);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getTeacherList();
      setAssessments(res.data?.data ?? []);
    } catch {
      toast.error("Failed to load assessments.");
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return assessments;
    const q = searchQuery.toLowerCase();
    return assessments.filter(
      (a) => a.title.toLowerCase().includes(q) || a.code.toLowerCase().includes(q),
    );
  }, [assessments, searchQuery]);

  return (
    <div className="font-poppins">
      <div className="backdrop-blur-sm border border-white/20 overflow-hidden bg-white/70">
        <div className="bg-gradient-to-r from-chestnut to-chestnut/90 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={openMobileNav} className="lg:hidden text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button onClick={() => navigate(-1)} className="p-1.5 hidden sm:block">
              <ArrowLeft size={16} className="text-white" />
            </button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-white" />
              <h2 className="font-semibold text-base text-white leading-none">Exam Focus</h2>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 min-h-screen max-w-5xl mx-auto space-y-5">
          <div>
            <p className="text-sm text-slate-500 max-w-2xl">
              Pick an assessment to see the pass rate for every question — spot exactly which topics the class needs more work on before the real exam.
            </p>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or code…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading assessments…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <BarChart3 className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">
                {assessments.length === 0 ? "No assessments yet" : "No assessments match your search"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {assessments.length === 0
                  ? "Create an assessment first, then come back here once students have attempted it."
                  : "Try adjusting your search query."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((a) => (
                <button
                  key={a.assessmentId}
                  type="button"
                  onClick={() => setAnalyticsAssessmentId(a.assessmentId)}
                  className="w-full text-left rounded-xl border border-slate-200 bg-white hover:border-chestnut/40 hover:shadow-sm transition-all px-4 sm:px-5 py-4 flex items-center justify-between gap-3"
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
                    </div>
                  </div>
                  <BarChart3 className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AssessmentAnalyticsModal
        assessmentId={analyticsAssessmentId}
        onClose={() => setAnalyticsAssessmentId(null)}
      />
    </div>
  );
};

export default ExamFocusPage;
