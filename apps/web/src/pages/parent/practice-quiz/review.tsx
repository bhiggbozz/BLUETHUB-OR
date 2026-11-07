import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock3, Plus, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import parentQuizService, { type ParentQuizResultDto } from "@/services/parent-quiz";
import { QuizResultQuestion } from "@/component/quiz-result-question";
import { Button } from "../component/ui/button";
import { ErrorState, Skeleton } from "../component/ui/feedback";
import { PageHeader } from "../component/ui/panel";
import { fadeUp, stagger } from "../component/ui/motion";
import { extractErrorMessage } from "../lib/format";
import { formatDuration } from "./lib";

function SummaryStat({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: "present" | "absent" | "neutral"; label: string; value: string }) {
  const toneCls =
    tone === "present"
      ? "bg-(--pp-present-soft) text-(--pp-present)"
      : tone === "absent"
        ? "bg-(--pp-absent-soft) text-(--pp-absent)"
        : "bg-(--pp-text)/5 text-(--pp-muted)";
  return (
    <div className="flex items-center gap-2.5">
      <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${toneCls}`}>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[11px] text-(--pp-subtle)">{label}</p>
        <p className="pp-num text-[15px] font-semibold text-(--pp-text)">{value}</p>
      </div>
    </div>
  );
}

const ParentPracticeQuizReview = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<ParentQuizResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    parentQuizService
      .getQuizResult(quizId)
      .then((res) => {
        if (!cancelled) setResult(res.data?.data ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, "The review isn't ready yet."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
      <button
        type="button"
        onClick={() => navigate("/parent/practice-quiz/quizzes")}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-(--pp-muted) hover:text-(--pp-text)"
      >
        <ArrowLeft className="size-3.5" /> My quizzes
      </button>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading review">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : error || !result ? (
        <div role="alert">
          <ErrorState title="Couldn't load this review" message={error ?? "Something went wrong."} />
        </div>
      ) : (
        <>
          <PageHeader eyebrow={result.quiz.subjectName} title={result.quiz.title} />

          <motion.div variants={fadeUp} className="pp-surface flex flex-wrap items-center gap-5 p-5 sm:p-6">
            <SummaryStat
              icon={result.quiz.isPassed ? CheckCircle2 : XCircle}
              tone={result.quiz.isPassed ? "present" : "absent"}
              label={result.quiz.isPassed ? "Passed" : "Not passed"}
              value={`${Math.round(result.quiz.scorePercent ?? 0)}%`}
            />
            <SummaryStat icon={CheckCircle2} tone="present" label="Correct" value={String(result.totalCorrect)} />
            <SummaryStat icon={XCircle} tone="absent" label="Wrong" value={String(result.totalWrong)} />
            <SummaryStat icon={Clock3} tone="neutral" label="Skipped" value={String(result.totalSkipped)} />
            {result.timeTakenSeconds !== null && (
              <SummaryStat icon={Clock3} tone="neutral" label="Time taken" value={formatDuration(result.timeTakenSeconds)} />
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-4">
            {result.questions.map((q) => (
              <QuizResultQuestion key={q.questionId} question={q} perspective="parent" />
            ))}
          </motion.div>

          <motion.div variants={fadeUp}>
            <Button icon={<Plus className="size-4" />} onClick={() => navigate("/parent/practice-quiz")}>
              Create another quiz on this subject
            </Button>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default ParentPracticeQuizReview;
