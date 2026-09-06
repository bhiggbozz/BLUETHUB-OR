import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  FileQuestion,
  ListOrdered,
  Loader2,
  Lock,
  RotateCcw,
  Timer,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import {
  quizService,
  type QuizAnswerSubmission,
  type QuizQuestionDetailDto,
  type QuizResultDto,
  type StartQuizResponse,
  type StudentQuizDisplayDto,
  type StudentQuizQuestionDto,
} from "@/services/quiz";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════════════════════
// Quiz Timer Hook
// ═══════════════════════════════════════════════════════════════════════════════

const useQuizTimer = (minutes: number | null, onTimeUp: () => void) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // Reset timer when minutes prop changes
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSecondsLeft(minutes ? minutes * 60 : null);
  }, [minutes]);

  // Run countdown when secondsLeft is positive
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    if (intervalRef.current) return; // already running

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [secondsLeft]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return { secondsLeft, formatted: secondsLeft !== null ? fmt(secondsLeft) : null };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Quiz Attempt Panel
// ═══════════════════════════════════════════════════════════════════════════════

interface QuizAttemptPanelProps {
  lessonId?: string;
  quizCode?: string;
  onClose: () => void;
}

type QuizAnswerValue =
  | { type: "option"; optionId: string }
  | { type: "text"; text: string };

type Phase =
  | "preview"
  | "loading"
  | "quiz"
  | "submitting"
  | "result"
  | "blocked";

const QuizAttemptPanel = ({ lessonId, quizCode, onClose }: QuizAttemptPanelProps) => {
  const [phase, setPhase] = useState<Phase>("preview");
  const [preview, setPreview] = useState<StudentQuizDisplayDto | null>(null);
  const [startResponse, setStartResponse] = useState<StartQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuizAnswerValue>>({});
  const [result, setResult] = useState<QuizResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const displayQuestionsById = useRef<Record<string, StudentQuizQuestionDto>>({});
  useEffect(() => {
    if (preview?.questions) {
      const map: Record<string, StudentQuizQuestionDto> = {};
      for (const q of preview.questions) {
        map[q.questionId] = q;
      }
      displayQuestionsById.current = map;
    }
  }, [preview?.questions]);

  // ── Load preview on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let res;
        if (quizCode) {
          res = await quizService.getStudentQuizDisplayByCode(quizCode);
        } else if (lessonId) {
          res = await quizService.getStudentQuizDisplay(lessonId);
        } else {
          throw new Error("No lessonId or quizCode provided.");
        }
        const data = res.data?.data;
        if (!data) {
          throw new Error(res.data?.responseMessage || "Quiz not available.");
        }
        if (cancelled) return;

        setPreview(data);

        if (!data.attemptStatus.canStart) {
          setPhase("blocked");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load quiz preview.";
        setError(msg);
        toast.error(msg);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [lessonId, quizCode]);

  const timeLimitMinutes = startResponse?.timeLimitMinutes ?? preview?.config.timeLimitMinutes ?? null;
  const handleTimeUp = () => {
    toast.error("Time is up! Submitting your answers now.");
    void handleSubmit(); // submit existing answers; unanswered questions auto-skip
  };
  const { formatted: timerDisplay } = useQuizTimer(timeLimitMinutes, handleTimeUp);

  // ── Start / Resume Quiz ───────────────────────────────────────────────────
  const handleStart = async () => {
    if (!preview) return;
    try {
      setPhase("loading");
      setError(null);

      // Resume existing in-progress attempt if present
      if (preview.attemptStatus.hasInProgressAttempt && preview.attemptStatus.inProgressAttemptId) {
        const resultRes = await quizService.getQuizResult(preview.attemptStatus.inProgressAttemptId);
        const resultData = resultRes.data?.data;
        if (resultData && resultData.status !== "InProgress") {
          // Already finished somehow — treat as result
          setResult(resultData);
          setPhase("result");
          return;
        }
        // Otherwise we need to fetch the attempt's questions somehow.
        // Fallback: start a new attempt (backend should handle resume)
      }

      const res = await quizService.startQuizAttempt({ lessonId: preview.lessonId });
      const data = res.data?.data;
      if (!data) {
        throw new Error(res.data?.responseMessage || "Quiz not found for this lesson.");
      }
      setStartResponse(data);
      startTimeRef.current = Date.now();
      setPhase("quiz");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start quiz.";
      setError(msg);
      toast.error(msg);
      setPhase(preview && !preview.attemptStatus.canStart ? "blocked" : "preview");
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { type: "option", optionId } }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { type: "text", text } }));
  };

  const handleSkip = () => {
    if (!confirm("Are you sure you want to skip this quiz? It will be recorded as skipped.")) return;
    void handleSubmit(true);
  };

  const handleSubmit = async (isSkipped = false) => {
    if (!startResponse) return;

    const payloadAnswers: QuizAnswerSubmission[] = startResponse.questions.map((q) => {
      const ans = answers[q.questionId];
      if (!ans || isSkipped) {
        return {
          questionId: q.questionId,
          selectedOptionId: null,
          typedAnswer: null,
          isSkipped: true,
        };
      }
      if (ans.type === "option") {
        return {
          questionId: q.questionId,
          selectedOptionId: ans.optionId,
          typedAnswer: null,
          isSkipped: false,
        };
      }
      return {
        questionId: q.questionId,
        selectedOptionId: null,
        typedAnswer: ans.text,
        isSkipped: false,
      };
    });

    const timeTakenSeconds = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : null;

    try {
      setPhase("submitting");
      const res = await quizService.submitQuizAttempt(startResponse.attemptId, {
        answers: payloadAnswers,
        timeTakenSeconds,
      });
      const data = res.data?.data;
      if (!data) {
        const resultRes = await quizService.getQuizResult(startResponse.attemptId);
        const resultData = resultRes.data?.data;
        if (resultData) {
          setResult(resultData);
          setPhase("result");
        } else {
          throw new Error(res.data?.responseMessage || "Failed to get quiz result.");
        }
      } else {
        setResult(data);
        setPhase("result");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit quiz.";
      toast.error(msg);
      setPhase("quiz");
    }
  };

  const isTextQuestion = (q: QuizQuestionDetailDto | StudentQuizQuestionDto) =>
    q.questionType === 2 || q.questionType === 3;

  const handleRetake = async () => {
    try {
      setPhase("loading");
      setResult(null);
      setAnswers({});
      let res;
      if (quizCode) {
        res = await quizService.getStudentQuizDisplayByCode(quizCode);
      } else if (lessonId) {
        res = await quizService.getStudentQuizDisplay(lessonId);
      } else {
        throw new Error("No lessonId or quizCode provided.");
      }
      const data = res.data?.data;
      if (!data) {
        throw new Error(res.data?.responseMessage || "Quiz not available.");
      }
      setPreview(data);
      setPhase(data.attemptStatus.canStart ? "preview" : "blocked");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reload quiz.";
      toast.error(msg);
      setPhase("preview");
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // PREVIEW / START SCREEN
  // ═════════════════════════════════════════════════════════════════════════════
  if (phase === "preview" || phase === "blocked") {
    const cfg = preview?.config;
    const status = preview?.attemptStatus;
    const isBlocked = phase === "blocked";

    return (
      <div className="flex flex-col gap-5 py-6 px-1 text-center">
        {/* Icon */}
        <div className="mx-auto rounded-full bg-gradient-to-br from-[#eef2ff] to-[#e0e7ff] p-4 shadow-sm">
          <FileQuestion className="h-9 w-9 text-[#4255db]" />
        </div>

        {/* Title */}
        <div>
          <p className="text-base font-bold text-slate-800">
            {cfg ? `Quiz — ${preview?.quizCode ?? ""}` : "Quiz Preview"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {cfg
              ? `${preview?.totalQuestions ?? 0} questions · ${preview?.totalMarks ?? 0} total marks`
              : "Complete the lesson material before attempting the quiz."}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        {/* Quiz info cards */}
        {cfg && (
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Time Limit</p>
                <p className="text-sm font-bold text-slate-700">
                  {cfg.timeLimitMinutes ? `${cfg.timeLimitMinutes} min` : "No limit"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
              <RotateCcw className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attempts</p>
                <p className="text-sm font-bold text-slate-700">
                  {status?.completedAttempts ?? 0} / {cfg.maxAttempts}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
              <Trophy className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pass Mark</p>
                <p className="text-sm font-bold text-slate-700">{cfg.passMarkPercent}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
              <Zap className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Auto Submit</p>
                <p className="text-sm font-bold text-slate-700">
                  {cfg.autoSubmitOnTimeout ? "On" : "Off"}
                </p>
              </div>
            </div>

            {cfg.shuffleQuestions && (
              <div className="col-span-2 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
                <ListOrdered className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Shuffle</p>
                  <p className="text-sm font-bold text-slate-700">Questions are randomized per attempt</p>
                </div>
              </div>
            )}

            {/* Difficulty scoring */}
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 text-left">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-chestnut" />
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Marks per Difficulty</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  <span className="font-bold text-slate-700">Easy:</span>{" "}
                  <span className="text-emerald-600 font-semibold">{cfg.easyMarks}</span>
                </span>
                <span className="text-sm">
                  <span className="font-bold text-slate-700">Medium:</span>{" "}
                  <span className="text-amber-600 font-semibold">{cfg.mediumMarks}</span>
                </span>
                <span className="text-sm">
                  <span className="font-bold text-slate-700">Hard:</span>{" "}
                  <span className="text-rose-600 font-semibold">{cfg.hardMarks}</span>
                </span>
                <span className="text-sm">
                  <span className="font-bold text-slate-700">Expert:</span>{" "}
                  <span className="text-violet-600 font-semibold">{cfg.examLevelMarks}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {isBlocked && status ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm font-semibold">
              <Lock className="h-10 w-10 md:w-4 md:h-4" />
              {status.maxAttemptsReached
                ? "Maximum attempts reached. You cannot retake this quiz."
                : status.hasInProgressAttempt
                ? "You have an in-progress attempt. Resume to continue."
                : "You are not allowed to start this quiz right now."}
            </div>

            {status.hasInProgressAttempt && !status.maxAttemptsReached && (
              <Button
                onClick={() => void handleStart()}
                className="w-full rounded-full bg-[#4255db] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3447cc]"
              >
                Resume Quiz
              </Button>
            )}

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full rounded-full border-slate-300 px-6 text-sm text-slate-600"
            >
              Close
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => void handleStart()}
            disabled={!preview}
            className="w-full rounded-full bg-[#4255db] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3447cc] disabled:opacity-50"
          >
            Start Quiz
          </Button>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // LOADING SCREEN
  // ═════════════════════════════════════════════════════════════════════════════
  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading quiz…</span>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // RESULT SCREEN
  // ═════════════════════════════════════════════════════════════════════════════
  if (phase === "result" && result) {
    const passed = result.isPassed;
    const didSkip = result.status === "Skipped";

    // Compute corrected score — only count answers that have been graded
    // (auto-graded questions). Ungraded manual questions are excluded.
    let gradedTotal = 0;
    let obtained = 0;
    let pendingCount = 0;
    const hasAnswers = Array.isArray(result.answers) && result.answers.length > 0;
    if (hasAnswers) {
      for (const a of result.answers) {
        if (a.marksObtained !== null) {
          gradedTotal += a.maxMarks;
          obtained += a.marksObtained;
        } else {
          pendingCount++;
        }
      }
    }
    const useCorrected = hasAnswers && gradedTotal > 0;
    const displayTotal = useCorrected ? gradedTotal : result.totalMarks;
    const displayObtained = useCorrected ? obtained : result.autoMarksObtained + result.manualMarksObtained;
    const displayPercent = useCorrected ? (obtained / gradedTotal) * 100 : result.finalScorePercent;
    const allPending = hasAnswers && gradedTotal === 0 && pendingCount > 0;

    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        {didSkip ? (
          <Clock className="h-14 w-14 text-amber-500" />
        ) : passed ? (
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        ) : (
          <XCircle className="h-14 w-14 text-rose-500" />
        )}
        <div>
          {didSkip ? (
            <>
              <p className="text-xl font-bold text-amber-600">Quiz Skipped</p>
              <p className="mt-1 text-sm text-slate-600">You can retake this quiz later if retakes are allowed.</p>
            </>
          ) : allPending ? (
            <>
              <p className="text-lg font-bold text-amber-600">Awaiting Review</p>
              <p className="mt-1 text-sm text-slate-600">
                Your answers have been submitted. The quiz contains questions that require manual grading. Your score will appear once the teacher completes the review.
              </p>
            </>
          ) : (
            <>
              <p className={`text-2xl font-bold ${passed ? "text-emerald-600" : "text-rose-600"}`}>
                {displayPercent.toFixed(0)}%
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {displayObtained} / {displayTotal} marks{pendingCount > 0 && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">
                    ({pendingCount} pending review)
                  </span>
                )}
              </p>
              <p className={`mt-2 text-sm font-semibold ${passed ? "text-emerald-600" : "text-rose-500"}`}>
                {passed ? "Well done — you passed!" : "Better luck next time!"}
              </p>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-full border-slate-300 px-6 text-sm text-slate-600">
            Close
          </Button>
          {preview?.config.allowRetakes && (
            <Button
              onClick={() => void handleRetake()}
              className="rounded-full bg-[#4255db] px-6 text-sm font-semibold text-white hover:bg-[#3447cc]"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // QUIZ SCREEN
  // ═════════════════════════════════════════════════════════════════════════════
  if (!startResponse) return null;

  const questions = startResponse.questions;
  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Quiz — {totalCount} question{totalCount !== 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {answeredCount} of {totalCount} answered
          </p>
        </div>
        <div className="flex items-center gap-3">
          {timerDisplay && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Timer className="h-3.5 w-3.5" />
              <span>{timerDisplay}</span>
            </div>
          )}
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#4255db] transition-all"
              style={{ width: `${totalCount ? (answeredCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {questions.map((question, qIdx) => {
          const ans = answers[question.questionId];
          const isTrueFalse = question.questionType === 4;
          // Backend shuffles each attempt's options for anti-cheat and returns
          // them in that shuffled array order — sort by optionLabel so the
          // display order is A,B,C... without touching which content each
          // label holds (so it can't undo the shuffle).
          const options = question.options && question.options.length > 0
            ? [...question.options].sort((a, b) => a.optionLabel.localeCompare(b.optionLabel))
            : isTrueFalse
              ? [{ optionId: "true", optionLabel: "A", optionText: "True" }, { optionId: "false", optionLabel: "B", optionText: "False" }]
              : [];
          const hasOptions = options.length > 0;
          const isText = isTextQuestion(question);

          return (
            <div key={question.questionId} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  <span className="mr-2 text-[#4255db]">Q{qIdx + 1}.</span>
                  {question.title}
                </p>
                {/* Question type badge + Difficulty badge */}
                <div className="flex shrink-0 gap-1.5">
                  {(question as any).questionTypeName && (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#4255db] uppercase tracking-wider">
                      {(question as any).questionTypeName}
                    </span>
                  )}
                  {(question as any).difficultyName && (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                      {(question as any).difficultyName}
                    </span>
                  )}
                </div>
              </div>

              {question.textContent && (
                <p className="mt-1.5 text-sm text-slate-600">{question.textContent}</p>
              )}

              {(() => {
                const imgUrl = displayQuestionsById.current[question.questionId]?.imageUrl ?? (question as any).imageUrl ?? null;
                if (!imgUrl) return null;
                return (
                  <div className="mt-3">
                    <img
                      src={imgUrl}
                      alt="Question image"
                      className="max-h-64 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                );
              })()}

              {isText || !hasOptions ? (
                <div className="mt-3">
                  <textarea
                    value={ans?.type === "text" ? ans.text : ""}
                    onChange={(e) => handleTextChange(question.questionId, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={question.questionType === 3 ? 5 : 2}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#4255db] focus:ring-1 focus:ring-[#4255db] outline-none resize-none"
                  />
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {options.map((option) => {
                    const selected = isTrueFalse
                      ? ans?.type === "text" && ans.text === option.optionText
                      : ans?.type === "option" && ans.optionId === option.optionId;
                    return (
                      <button
                        key={option.optionId}
                        type="button"
                        onClick={() =>
                          isTrueFalse
                            ? handleTextChange(question.questionId, option.optionText)
                            : handleSelectOption(question.questionId, option.optionId)
                        }
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                          selected
                            ? "border-[#4255db] bg-[#eef2ff] font-semibold text-[#4255db]"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                            selected
                              ? "border-[#4255db] bg-[#4255db] text-white"
                              : "border-slate-300 bg-white text-slate-500"
                          }`}
                        >
                          {option.optionLabel}
                        </span>
                        <span className="flex-1">{option.optionText}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Show resolvedMaxMarks instead of marksAllocation */}
              <p className="mt-2 text-right text-[11px] text-slate-400">
                {(question as any).resolvedMaxMarks !== undefined
                  ? `${(question as any).resolvedMaxMarks} mark${(question as any).resolvedMaxMarks !== 1 ? "s" : ""}`
                  : `${question.marksAllocation} mark${question.marksAllocation !== 1 ? "s" : ""}`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={handleSkip}
          disabled={phase === "submitting"}
          className="rounded-full border-slate-300 px-5 text-sm text-slate-600"
        >
          Skip Quiz
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={phase === "submitting"}
            className="rounded-full border-slate-300 px-5 text-sm text-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={phase === "submitting" || answeredCount < totalCount}
            className="rounded-full bg-[#4255db] px-6 text-sm font-semibold text-white hover:bg-[#3447cc] disabled:opacity-50"
          >
            {phase === "submitting" ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              `Submit Quiz (${answeredCount}/${totalCount})`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizAttemptPanel;
