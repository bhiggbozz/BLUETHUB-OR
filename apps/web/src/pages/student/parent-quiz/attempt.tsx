import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@bluethub/ui-kit";
import { AlertTriangle, ArrowLeft, ArrowRight, Clock, FileQuestion, Loader2, Send } from "lucide-react";
import parentQuizService, {
  type ParentQuizOptionDto,
  type ParentQuizResultDto,
  type StartParentQuizDto,
} from "@/services/parent-quiz";
import { RichContent } from "@/component/rich-content";
import { loadSavedAnswers, saveAnswers, clearSavedAnswers } from "./answer-storage";
import { useDeadlineTimer } from "./use-deadline-timer";
import { ParentQuizResultView } from "./components/result-view";

type Phase = "loading" | "quiz" | "submitting" | "result" | "blocked" | "error";

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { responseMessage?: string; message?: string } | undefined;
    return data?.responseMessage || data?.message || err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

const StudentParentQuizAttempt = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [start, setStart] = useState<StartParentQuizDto | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<ParentQuizResultDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!quizId) return;
    let cancelled = false;
    setPhase("loading");
    parentQuizService
      .startQuiz(quizId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (!data) {
          setMessage(res.data?.responseMessage || "This quiz isn't available right now.");
          setPhase("error");
          return;
        }
        setStart(data);
        setAnswers(loadSavedAnswers(data.attemptId));
        setPhase("quiz");
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(extractMessage(err, "Couldn't start this quiz."));
        setPhase("blocked");
      });
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const handleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: optionId };
      if (start) saveAnswers(start.attemptId, next);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!start || !quizId || submittedRef.current) return;
    submittedRef.current = true;
    setPhase("submitting");
    setConfirmOpen(false);
    try {
      const res = await parentQuizService.submitQuiz(quizId, {
        answers: start.questions.map((q) => ({ questionId: q.questionId, selectedOptionId: answers[q.questionId] ?? null })),
      });
      const data = res.data?.data;
      clearSavedAnswers(start.attemptId);
      if (data) {
        setResult(data);
        setPhase("result");
      } else {
        throw new Error(res.data?.responseMessage || "Failed to submit.");
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 409) {
        // Already submitted — fetch and show the result instead of erroring.
        try {
          const res = await parentQuizService.getMyQuizResult(quizId);
          if (res.data?.data) {
            setResult(res.data.data);
            setPhase("result");
            return;
          }
        } catch {
          // fall through to generic error below
        }
      }
      submittedRef.current = false;
      toast.error(extractMessage(err, "Couldn't submit your answers. Please try again."));
      setPhase("quiz");
    }
  };

  const { secondsLeft, formatted: timerDisplay, announcement } = useDeadlineTimer(
    start?.startedAt ?? null,
    start?.timeLimitMinutes ?? null,
    () => {
      toast.error("Time is up! Submitting your answers now.");
      void handleSubmit();
    },
  );

  const questions = start?.questions ?? [];
  const totalCount = questions.length;
  const answeredCount = useMemo(() => questions.filter((q) => answers[q.questionId]).length, [questions, answers]);
  const unansweredCount = totalCount - answeredCount;
  const currentQuestion = questions[currentIndex];

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#4255db]" />
        <span className="text-sm">Loading your quiz…</span>
      </div>
    );
  }

  if (phase === "blocked" || phase === "error") {
    return (
      <div className="mx-auto max-w-lg p-4 md:p-6">
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-sm text-slate-600">{message}</p>
          <div className="mt-2 flex gap-3">
            <Button variant="outline" onClick={() => navigate("/student/parent-quiz")} className="rounded-full">
              Back to list
            </Button>
            {phase === "blocked" && quizId && (
              <Button
                onClick={async () => {
                  try {
                    const res = await parentQuizService.getMyQuizResult(quizId);
                    if (res.data?.data) {
                      setResult(res.data.data);
                      setPhase("result");
                    }
                  } catch (err) {
                    toast.error(extractMessage(err, "The result isn't ready yet."));
                  }
                }}
                className="rounded-full bg-[#4255db] hover:bg-[#3447cc]"
              >
                See result
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    return <ParentQuizResultView result={result} />;
  }

  if (!currentQuestion) return null;

  const options = sortOptions(currentQuestion.options, currentQuestion.questionType);
  const selected = answers[currentQuestion.questionId];

  return (
    <div className="mx-auto max-w-[900px] p-4 md:p-6">
      <p aria-live="polite" className="sr-only">{announcement}</p>

      <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#292382] to-[#3D36A8] px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80">
              <FileQuestion className="w-4 h-4" />
              <span className="text-sm font-medium">Question {currentIndex + 1} of {totalCount}</span>
            </div>
            <div className="flex items-center gap-4 text-white">
              <span className="text-xs text-white/60">{answeredCount}/{totalCount} answered</span>
              {timerDisplay && (
                <span className={`flex items-center gap-1 text-sm font-mono font-bold ${secondsLeft !== null && secondsLeft < 60 ? "text-red-300 animate-pulse" : ""}`}>
                  <Clock className="w-4 h-4" /> {timerDisplay}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white/60 transition-all duration-300" style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }} />
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Jump to question">
            {questions.map((q, i) => {
              const isAnswered = Boolean(answers[q.questionId]);
              return (
                <button
                  key={q.questionId}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  aria-current={i === currentIndex}
                  aria-label={`Question ${i + 1}${isAnswered ? ", answered" : ", not answered"}`}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold transition-colors ${
                    i === currentIndex
                      ? "bg-[#4255db] text-white"
                      : isAnswered
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 text-slate-400 border border-slate-200"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <RichContent
              text={currentQuestion.title}
              html={currentQuestion.questionHtml}
              contentParts={currentQuestion.contentParts}
              className="block text-sm font-semibold text-slate-800 mb-1"
            />
            {currentQuestion.textContent && !currentQuestion.questionHtml && (
              <RichContent text={currentQuestion.textContent} className="block text-sm text-slate-600 mb-4" />
            )}
            {currentQuestion.imageUrl && (
              <div className="mb-4">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question"
                  className="max-w-full max-h-64 rounded-xl border border-slate-200 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}

            <div className="space-y-2">
              {options.map((opt) => {
                const isSelected = selected === opt.optionId;
                return (
                  <button
                    key={opt.optionId}
                    type="button"
                    onClick={() => handleAnswer(currentQuestion.questionId, opt.optionId)}
                    aria-pressed={isSelected}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected ? "border-[#4255db] bg-[#eef2ff] text-[#4255db]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? "bg-[#4255db] text-white" : "bg-slate-100 text-slate-500"}`}>
                      {opt.optionLabel}
                    </span>
                    <RichContent text={opt.optionText} html={opt.optionHtml} contentParts={opt.contentParts} className="text-sm" />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1.5 rounded-full border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-30"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={phase === "submitting"}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> {phase === "submitting" ? "Submitting…" : "Submit"}
                </Button>
                {currentIndex < totalCount - 1 && (
                  <Button
                    onClick={() => setCurrentIndex((i) => Math.min(totalCount - 1, i + 1))}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#4255db] px-4 text-sm font-semibold text-white hover:bg-[#3447cc]"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredCount > 0
                ? `You still have ${unansweredCount} question${unansweredCount === 1 ? "" : "s"} unanswered. You can go back and finish them, or submit as is.`
                : "You've answered every question."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSubmit()}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function sortOptions(options: ParentQuizOptionDto[], questionType: number): ParentQuizOptionDto[] {
  if (options && options.length > 0) {
    return [...options].sort((a, b) => a.orderIndex - b.orderIndex);
  }
  if (questionType === 4) {
    return [
      { optionId: "true", optionLabel: "A", optionText: "True", optionHtml: null, contentParts: null, hasLatex: false, orderIndex: 1 },
      { optionId: "false", optionLabel: "B", optionText: "False", optionHtml: null, contentParts: null, hasLatex: false, orderIndex: 2 },
    ];
  }
  return [];
}

export default StudentParentQuizAttempt;
