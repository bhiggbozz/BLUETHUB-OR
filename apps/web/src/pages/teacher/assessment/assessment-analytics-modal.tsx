import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@bluethub/ui-kit";
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  BarChart3,
  Info,
  LayoutList,
  Loader2,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  assessmentService,
  type AssessmentAnalytics,
  type QuestionAnalyticsStat,
} from "@/services/assessment";

interface AssessmentAnalyticsModalProps {
  assessmentId: string | null;
  onClose: () => void;
}

// ShortAnswer / Essay — the same rule used elsewhere in the app (my-uploads,
// quiz-attempt-panel) for "this question type needs manual grading".
const isTheoryType = (questionType: number) => questionType === 2 || questionType === 3;

function successRateStyle(rate: number) {
  if (rate < 50) return { bar: "bg-red-500", text: "text-red-600", chip: "bg-red-50 text-red-600 border-red-200" };
  if (rate < 75) return { bar: "bg-amber-500", text: "text-amber-600", chip: "bg-amber-50 text-amber-600 border-amber-200" };
  return { bar: "bg-emerald-500", text: "text-emerald-600", chip: "bg-emerald-50 text-emerald-600 border-emerald-200" };
}

interface MissingQuestionRow {
  questionId: string;
  title: string;
  maxMarks: number;
}

interface TopicGroup {
  topicId: string;
  topicName: string;
  questionCount: number;
  totalAttempts: number;
  avgSuccessRate: number;
}

const AssessmentAnalyticsModal = ({ assessmentId, onClose }: AssessmentAnalyticsModalProps) => {
  const [analytics, setAnalytics] = useState<AssessmentAnalytics | null>(null);
  const [missingQuestions, setMissingQuestions] = useState<MissingQuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sortDir, setSortDir] = useState<"worst" | "best">("worst");
  const [view, setView] = useState<"question" | "topic">("question");

  useEffect(() => {
    if (!assessmentId) {
      setAnalytics(null);
      setMissingQuestions([]);
      setErrorMsg("");
      setView("question");
      setSortDir("worst");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMsg("");

    Promise.allSettled([
      assessmentService.getAnalytics(assessmentId),
      assessmentService.getDetail(assessmentId),
    ]).then(([analyticsRes, detailRes]) => {
      if (cancelled) return;

      if (analyticsRes.status === "fulfilled") {
        const data = analyticsRes.value.data?.data ?? null;
        setAnalytics(data);

        // Cross-reference against the full question list — perQuestionStats
        // only includes questions with at least one answered attempt.
        if (data && detailRes.status === "fulfilled") {
          const answeredIds = new Set(data.perQuestionStats.map((q) => q.questionId));
          const allQuestions = detailRes.value.data?.data?.questions ?? [];
          setMissingQuestions(
            allQuestions
              .filter((q) => !answeredIds.has(q.questionId))
              .map((q) => ({ questionId: q.questionId, title: q.title, maxMarks: q.marksAllocation })),
          );
        } else {
          setMissingQuestions([]);
        }
      } else {
        const err = analyticsRes.reason;
        const message = err?.response?.data?.responseMessage as string | undefined;
        setErrorMsg(message || "Couldn't load analytics for this assessment.");
        setAnalytics(null);
        setMissingQuestions([]);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [assessmentId]);

  const sortedQuestions = useMemo(() => {
    if (!analytics) return [];
    const rows = [...analytics.perQuestionStats];
    // Backend already sorts ascending (worst-first); only re-sort for "best".
    if (sortDir === "best") rows.sort((a, b) => b.successRate - a.successRate);
    else rows.sort((a, b) => a.successRate - b.successRate);
    return rows;
  }, [analytics, sortDir]);

  const topicGroups = useMemo<TopicGroup[]>(() => {
    if (!analytics) return [];
    const map = new Map<string, { topicName: string; rates: number[]; attempts: number }>();
    analytics.perQuestionStats.forEach((q) => {
      const key = q.topicId || "__no_topic__";
      const name = q.topicName || "No topic assigned";
      const entry = map.get(key) ?? { topicName: name, rates: [], attempts: 0 };
      entry.rates.push(q.successRate);
      entry.attempts += q.totalAttempts;
      map.set(key, entry);
    });
    const groups: TopicGroup[] = Array.from(map.entries()).map(([topicId, v]) => ({
      topicId,
      topicName: v.topicName,
      questionCount: v.rates.length,
      totalAttempts: v.attempts,
      avgSuccessRate: v.rates.reduce((s, r) => s + r, 0) / v.rates.length,
    }));
    groups.sort((a, b) => (sortDir === "best" ? b.avgSuccessRate - a.avgSuccessRate : a.avgSuccessRate - b.avgSuccessRate));
    return groups;
  }, [analytics, sortDir]);

  const hasTheoryQuestions = analytics?.perQuestionStats.some((q) => isTheoryType(q.questionType)) ?? false;

  return (
    <Dialog open={!!assessmentId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[94%] rounded-2xl p-0 overflow-hidden max-h-[88vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {analytics && (
                <span className="text-[11px] font-mono text-chestnut bg-chestnut/10 px-2 py-0.5 rounded-full">
                  {analytics.code}
                </span>
              )}
              <DialogTitle className="text-sm font-bold text-gray-900 truncate">
                {analytics?.title || "Assessment Analytics"}
              </DialogTitle>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Per-question pass rate — where the class needs focus</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 py-10 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading analytics…</span>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="flex flex-col items-center text-center gap-2 py-10">
              <AlertCircle className="w-8 h-8 text-red-300" />
              <p className="text-sm font-medium text-gray-600">{errorMsg}</p>
            </div>
          )}

          {!loading && analytics && (
            <>
              {analytics.totalAttempts === 0 ? (
                <div className="flex flex-col items-center text-center gap-2 py-10">
                  <BarChart3 className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600">No attempts yet</p>
                  <p className="text-xs text-gray-400 max-w-xs">
                    Analytics will appear once students start attempting this assessment.
                  </p>
                </div>
              ) : (
                <>
                  {/* Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase flex items-center justify-center gap-1"><Users className="w-3 h-3" />Students</p>
                      <p className="text-base font-bold text-gray-800 mt-0.5">{analytics.totalStudents}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Attempts</p>
                      <p className="text-base font-bold text-gray-800 mt-0.5">{analytics.totalAttempts}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Avg Score</p>
                      <p className="text-base font-bold text-gray-800 mt-0.5">{analytics.averageScore.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase flex items-center justify-center gap-1"><Target className="w-3 h-3" />Pass Rate</p>
                      <p className="text-base font-bold text-gray-800 mt-0.5">{analytics.passRate.toFixed(1)}%</p>
                    </div>
                  </div>

                  {hasTheoryQuestions && (
                    <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-[11px] text-blue-700">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      This assessment has theory questions — figures below can shift as the teacher finishes manually grading them.
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setView("question")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${view === "question" ? "bg-white text-chestnut shadow-sm" : "text-gray-500"}`}
                      >
                        <LayoutList className="w-3.5 h-3.5" /> By Question
                      </button>
                      <button
                        type="button"
                        onClick={() => setView("topic")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${view === "topic" ? "bg-white text-chestnut shadow-sm" : "text-gray-500"}`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" /> By Topic
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSortDir((d) => (d === "worst" ? "best" : "worst"))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {sortDir === "worst" ? <ArrowUpAZ className="w-3.5 h-3.5" /> : <ArrowDownAZ className="w-3.5 h-3.5" />}
                      {sortDir === "worst" ? "Worst first" : "Best first"}
                    </button>
                  </div>

                  {/* By Question */}
                  {view === "question" && (
                    <div className="space-y-2">
                      {sortedQuestions.map((q, i) => (
                        <QuestionRow key={q.questionId} q={q} index={i + 1} />
                      ))}

                      {missingQuestions.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                            Not attempted yet ({missingQuestions.length})
                          </p>
                          {missingQuestions.map((q) => (
                            <div key={q.questionId} className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-3 py-2 mb-1.5">
                              <p className="text-xs text-gray-500 truncate">{q.title}</p>
                              <p className="text-[10px] text-gray-400">0 attempts · {q.maxMarks} mark{q.maxMarks !== 1 ? "s" : ""}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* By Topic */}
                  {view === "topic" && (
                    <div className="space-y-2">
                      {topicGroups.map((t) => {
                        const style = successRateStyle(t.avgSuccessRate);
                        return (
                          <div key={t.topicId} className="rounded-xl border border-gray-100 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-800 truncate">{t.topicName}</p>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${style.chip}`}>
                                {t.avgSuccessRate.toFixed(0)}% avg
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className={`h-full ${style.bar}`} style={{ width: `${Math.min(100, t.avgSuccessRate)}%` }} />
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1.5">
                              {t.questionCount} question{t.questionCount !== 1 ? "s" : ""} · {t.totalAttempts} total attempts
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function QuestionRow({ q, index }: { q: QuestionAnalyticsStat; index: number }) {
  const style = successRateStyle(q.successRate);
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-400">Q{index}</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5" title={q.questionTitle}>{q.questionTitle}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {[q.subjectName, q.topicName || "No topic"].filter(Boolean).join(" · ")}
            {isTheoryType(q.questionType) && <span className="ml-1.5 text-blue-500 font-medium">· Theory</span>}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${style.chip}`}>
          {q.successRate.toFixed(0)}%
        </span>
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${style.bar}`} style={{ width: `${Math.min(100, q.successRate)}%` }} />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          Avg <span className={`font-semibold ${style.text}`}>{q.averageMarksObtained.toFixed(1)}</span> / {q.maxMarks} marks
        </span>
        <span>{q.totalAttempts} attempt{q.totalAttempts !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

export default AssessmentAnalyticsModal;
