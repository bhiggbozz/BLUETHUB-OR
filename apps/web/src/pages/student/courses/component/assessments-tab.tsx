import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@bluethub/ui-kit";
import PerformanceOverview from "./performance-overview";
import QuizRow from "./quiz-row";
import { quizService } from "@/services/quiz";
import { useAuthContext } from "@/contexts/auth-context";
import { getErrorMessage } from "./course-header";
import { getQuizStatus, type Quiz } from "../interfaces";

function QuizRowSkeleton() {
  return (
    <Card className="border-none shadow-sm p-0">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
        <span className="h-8 w-16 shrink-0 animate-pulse rounded-md bg-slate-200" />
      </CardContent>
    </Card>
  );
}

function QuizzesError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
      <div>
        <p className="text-sm font-semibold text-rose-700">Couldn&apos;t load quizzes</p>
        <p className="text-xs text-rose-500 sm:text-sm">{message}</p>
      </div>
    </div>
  );
}

function QuizzesEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
      <ClipboardList className="h-6 w-6 text-slate-400" />
      <p className="text-sm font-medium text-slate-500">No quizzes yet</p>
      <p className="text-xs text-slate-400 sm:text-sm">
        Quizzes your teacher publishes for this subject will show up here.
      </p>
    </div>
  );
}

function AssessmentsTab() {
  const { user } = useAuthContext();
  const { subjectId } = useParams<{ subjectId: string }>();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;

  useEffect(() => {
    if (!subjectId) {
      setErrorMessage("Subject ID is required");
      setLoading(false);
      return;
    }

    // Auth context can still be hydrating on first render.
    if (!userId) return;

    let isMounted = true;

    const loadSubjectQuizzes = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await quizService.getSubjectQuizzes(subjectId);
        if (!isMounted) return;
        setQuizzes((res.data.data as unknown as Quiz[]) ?? []);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "Something went wrong while loading quizzes"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSubjectQuizzes();

    return () => {
      isMounted = false;
    };
  }, [userId, subjectId]);

  const { active, locked } = useMemo(
    () => ({
      active: quizzes.filter((q) => getQuizStatus(q) !== "locked"),
      locked: quizzes.filter((q) => getQuizStatus(q) === "locked"),
    }),
    [quizzes]
  );

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
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <QuizRowSkeleton key={i} />
            ))}
          </div>
        ) : errorMessage ? (
          <QuizzesError message={errorMessage} />
        ) : quizzes.length === 0 ? (
          <QuizzesEmpty />
        ) : (
          <div className="space-y-3">
            {active.map((quiz) => (
              <QuizRow key={quiz.quizCode} quiz={quiz} />
            ))}
          </div>
        )}
      </div>

      {/* Locked quizzes: no backend rule for locking yet, so this only renders
          for the "no questions yet" case in getQuizStatus. */}
      {!loading && !errorMessage && locked.length > 0 && (
        <div>
          <p className="mb-3 px-1 text-sm font-semibold text-muted-foreground sm:text-base">
            Upcoming — locked
          </p>
          <div className="space-y-3">
            {locked.map((quiz) => (
              <QuizRow key={quiz.quizCode} quiz={quiz} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AssessmentsTab;