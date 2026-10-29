import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@bluethub/ui-kit";
import PerformanceOverview from "./performance-overview";
import QuizRow from "./quiz-row";
import quizService, { type SubjectQuizItemDto } from "@/services/quiz";
import { getErrorMessage } from "./course-header";
import type { Quiz } from "../interfaces";

function mapToQuiz(item: SubjectQuizItemDto): Quiz {
  const { attemptStatus, bestIsPassed, bestScorePercent } = item;

  let status: Quiz["status"];
  let helperText: string | undefined;

  if (bestIsPassed === true) {
    status = "pass";
  } else if (bestIsPassed === false) {
    status = "fail";
  } else if (attemptStatus.canStart) {
    status = "available";
  } else {
    status = "locked";
    helperText = attemptStatus.hasInProgressAttempt
      ? "In progress"
      : attemptStatus.maxAttemptsReached
        ? "No attempts left"
        : "Locked";
  }

  return {
    id: item.quizCode,
    title: item.lessonTitle,
    durationMinutes: item.config.timeLimitMinutes ?? 0,
    questionCount: item.totalQuestions,
    status,
    scorePercent: bestScorePercent ?? undefined,
    helperText,
  };
}

function QuizRowSkeleton() {
  return (
    <Card className="border-none shadow-sm p-0">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
        <span className="h-9 w-16 shrink-0 animate-pulse rounded bg-slate-200" />
      </CardContent>
    </Card>
  );
}

function QuizListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <QuizRowSkeleton key={i} />
      ))}
    </div>
  );
}

function AssessmentsError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
      <div>
        <p className="text-sm font-semibold text-rose-700">Couldn&apos;t load assessments</p>
        <p className="text-xs text-rose-500 sm:text-sm">{message}</p>
      </div>
    </div>
  );
}

function AssessmentsTab() {
  const { subjectId } = useParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) {
      setErrorMessage("Subject ID is required");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadQuizzes = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await quizService.getSubjectQuizzes(subjectId);
        if (!isMounted) return;

        if (!res.data.status) {
          setErrorMessage(res.data.responseMessage ?? "Failed to load assessments");
          return;
        }

        setQuizzes((res.data.data ?? []).map(mapToQuiz));
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "Something went wrong while loading assessments"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadQuizzes();

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  const active = quizzes.filter((q) => q.status !== "locked");
  const locked = quizzes.filter((q) => q.status === "locked");

  return (
    <div className="space-y-6">
      <PerformanceOverview />

      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-sm font-medium sm:text-base">Assessments &amp; Quizzes</span>
          {!loading && !errorMessage && (
            <span className="text-xs font-medium text-[#292382] sm:text-sm">{quizzes.length} Total</span>
          )}
        </div>

        {loading ? (
          <QuizListSkeleton />
        ) : errorMessage ? (
          <AssessmentsError message={errorMessage} />
        ) : quizzes.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">No quizzes yet for this subject.</p>
        ) : (
          <>
            <div className="space-y-3">
              {active.map((quiz) => (
                <QuizRow key={quiz.id} quiz={quiz} />
              ))}
            </div>

            {locked.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 px-1 text-sm font-semibold text-muted-foreground sm:text-base">
                  Upcoming — locked
                </p>
                <div className="space-y-3">
                  {locked.map((quiz) => (
                    <QuizRow key={quiz.id} quiz={quiz} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AssessmentsTab;
