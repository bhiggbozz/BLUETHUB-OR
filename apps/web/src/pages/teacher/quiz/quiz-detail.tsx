import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  FileQuestion,
  Clock,
  Target,
  Loader2,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import { quizService, type StudentQuizDisplayDto, type SubjectQuizItemDto } from "@/services/quiz";
import { useAuthContext } from "@/contexts/auth-context";

const ADMIN_ROLES = ["SuperAdministrator", "Administrator"];

const QuizDetail = () => {
  const { quizCode } = useParams<{ quizCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const isAdmin = ADMIN_ROLES.includes(user?.roleName ?? "");
  const quizListPath = isAdmin ? "/admin/quiz" : "/teacher/quiz";

  const navState = location.state as { quiz?: SubjectQuizItemDto } | null;

  const [display, setDisplay] = useState<StudentQuizDisplayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizCode) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await quizService.getStudentQuizDisplayByCode(quizCode);
        if (!cancelled) setDisplay(res.data?.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load quiz details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [quizCode]);

  const quiz = display;
  const fallback = navState?.quiz;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading quiz details…</span>
      </div>
    );
  }

  if (!quiz && !fallback) {
    return (
      <div className="p-6 text-center">
        {error && (
          <div className="mb-4 flex items-center gap-2 justify-center text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <p className="text-slate-500">Quiz not found.</p>
        <Button variant="outline" onClick={() => navigate(quizListPath)} className="mt-4">
          Back to Quizzes
        </Button>
      </div>
    );
  }

  const totalQuestions = quiz?.totalQuestions ?? fallback?.totalQuestions ?? 0;
  const totalMarks = quiz?.totalMarks ?? 0;
  const timeLimit = quiz?.config.timeLimitMinutes ?? fallback?.config.timeLimitMinutes ?? null;
  const passMark = quiz?.config.passMarkPercent ?? fallback?.config.passMarkPercent ?? 50;
  const completedAttempts = quiz?.attemptStatus.completedAttempts ?? fallback?.attemptStatus.completedAttempts ?? 0;
  const bestScore: number | null =
    (quiz?.attemptStatus.completedAttempts ?? fallback?.attemptStatus.completedAttempts ?? 0) > 0
      ? (fallback?.bestScorePercent ?? null)
      : null;

  return (
    <div className="md:p-4 font-poppins">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(quizListPath)}
          className="flex mt-5 md:mt-0 items-center gap-1.5 text-sm text-chestnut font-semibold mb-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </button>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error} — showing summary only
          </div>
        )}

        <div className="rounded-[20px] border border-[#E8E8E3] bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-sm font-bold text-[#0F0F0E]">Quiz {quizCode}</h1>
              <p className="text-sm text-[#A0A09C] mt-0.5">
                {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
                {totalMarks > 0 && ` · ${totalMarks} mark${totalMarks !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="rounded-full bg-chestnut/10 px-4 py-2 text-xs font-semibold text-chestnut">
              {timeLimit ? `${timeLimit} min` : "No time limit"}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Questions", value: totalQuestions, icon: FileQuestion },
              { label: "Total Marks", value: totalMarks, icon: Target },
              { label: "Pass Mark", value: `${passMark}%`, icon: BookOpen },
              { label: "Attempts", value: completedAttempts, icon: Clock },
            ].map((stat) => (
              <div key={stat.label} className="border border-[#E8E8E3] rounded-[12px] p-4">
                <stat.icon className="h-5 w-5 mb-2 text-chestnut" />
                <p className="text-base font-bold text-[#0F0F0E]">{stat.value}</p>
                <p className="text-xs text-[#A0A09C]">{stat.label}</p>
              </div>
            ))}
          </div>

          {bestScore !== null && (
            <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm">
              <span className="font-semibold text-emerald-700">
                Best Score: {bestScore.toFixed(0)}%
              </span>
            </div>
          )}

          {quiz?.questions && quiz.questions.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-[#0F0F0E] mb-3">
                Questions ({quiz.questions.length})
              </h2>
              <div className="space-y-3">
                {quiz.questions.map((q, i) => (
                  <div key={q.questionId} className="rounded-[12px] border border-[#E8E8E3] bg-[#FAFAFA] p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0F0F0E]">
                          <span className="text-chestnut mr-1.5">Q{i + 1}.</span>
                          {q.title}
                        </p>
                        {q.textContent && (
                          <p className="text-xs text-[#5A5A5A] mt-1">{q.textContent}</p>
                        )}
                        {q.imageUrl && (
                          <img
                            src={q.imageUrl}
                            alt=""
                            className="mt-2 max-h-40 rounded-lg border border-[#E8E8E3] object-contain"
                          />
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF1FB] text-chestnut uppercase">
                          {q.questionTypeName ?? `Type ${q.questionType}`}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                          {q.difficultyName ?? `Level ${q.difficultyLevel}`}
                        </span>
                      </div>
                    </div>

                    {q.options.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {q.options.map((opt) => (
                          <div
                            key={opt.optionId}
                            className="flex items-center gap-2 rounded-lg border border-[#E8E8E3] bg-white px-3 py-2 text-xs text-[#5A5A5A]"
                          >
                            <span className="font-bold text-chestnut">{opt.optionLabel}</span>
                            <span>{opt.optionText}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {(!quiz?.questions || quiz.questions.length === 0) && fallback && (
            <p className="text-sm text-[#A0A09C] text-center py-8">
              Full question details unavailable. Select this quiz from the subject view for more info.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizDetail;
