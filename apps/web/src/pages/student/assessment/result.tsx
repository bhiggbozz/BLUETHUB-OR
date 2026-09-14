import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { assessmentService, type AttemptResult } from "@/services/assessment";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  BarChart3,
  Clock,
  Trophy,
  Target,
  SkipForward,
} from "lucide-react";

const AssessmentResultPage = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await assessmentService.getResult(attemptId);
        if (!cancelled) setResult(res.data?.data ?? null);
      } catch (error) {
        if (cancelled) return;
        const body = error instanceof AxiosError ? error.response?.data : null;
        const message = body?.responseMessage as string | undefined;
        console.error("Failed to load assessment result:", error);
        setErrorMsg(message || "Couldn't load this result. Please try again.");
        setResult(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-[#4255db]" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-slate-500 px-6 text-center">
        <XCircle className="h-10 w-10" />
        <p className="text-sm font-medium">{errorMsg || "Result not found."}</p>
        <button onClick={() => navigate("/student/assessment")} className="text-[#4255db] text-sm font-semibold">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] p-4 md:p-6">
      <button
        onClick={() => navigate("/student/assessment")}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Assessments
      </button>

      <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className={`px-6 py-6 ${result.isPassed ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-gradient-to-r from-red-500 to-red-600"}`}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              {result.isPassed ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : (
                <XCircle className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{result.isPassed ? "Passed!" : "Failed"}</h1>
            <p className="text-white/80 text-sm mt-1">{result.title}</p>
            <p className="text-white/60 text-xs mt-0.5 font-mono">{result.assessmentCode}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-center">
              <BarChart3 className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Score</p>
              <p className={`text-xl font-bold ${result.isPassed ? "text-emerald-600" : "text-red-500"}`}>
                {result.finalScorePercent.toFixed(0)}%
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-center">
              <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Obtained</p>
              <p className="text-xl font-bold text-slate-800">
                {(result.autoMarksObtained + result.manualMarksObtained).toFixed(0)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-center">
              <Target className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Total</p>
              <p className="text-xl font-bold text-slate-800">{result.totalMarks.toFixed(0)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-center">
              <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Attempt</p>
              <p className="text-xl font-bold text-slate-800">#{result.attemptNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <span>Auto: {result.autoMarksObtained.toFixed(0)} marks</span>
            {result.manualMarksObtained > 0 && (
              <>
                <span>·</span>
                <span>Manual: {result.manualMarksObtained.toFixed(0)} marks</span>
              </>
            )}
            <span>·</span>
            <span>Submitted: {new Date(result.submittedAt).toLocaleDateString()}</span>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Question Breakdown</p>
            {result.answers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-8 text-center">
                <BarChart3 className="size-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Detailed question results are not available</p>
                <p className="text-xs text-slate-400">The assessment has not been configured to show correct answers.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {result.answers.map((answer, i) => (
                  <div
                    key={answer.questionId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {answer.isSkipped ? (
                        <SkipForward className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : answer.isCorrect === true ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : answer.isCorrect === false ? (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-[8px] text-amber-700 font-bold shrink-0">P</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          Question {i + 1}
                        </p>
                        <p className="text-xs text-slate-400">
                          {answer.questionType === 0 ? "Objective" : "Theory"} · {answer.maxMarks} mark{answer.maxMarks !== 1 ? "s" : ""}
                          {answer.teacherFeedback && ` · Feedback: ${answer.teacherFeedback}`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ml-3 ${
                      answer.isSkipped ? "text-slate-400" : answer.isCorrect === true ? "text-emerald-600" : answer.isCorrect === false ? "text-red-500" : "text-amber-600"
                    }`}>
                      {answer.isSkipped ? "—" : `${answer.marksObtained.toFixed(0)}/${answer.maxMarks.toFixed(0)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={() => navigate("/student/assessment")}
              className="w-full rounded-full bg-[#4255db] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3447cc] transition-colors"
            >
              Back to Assessments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultPage;
