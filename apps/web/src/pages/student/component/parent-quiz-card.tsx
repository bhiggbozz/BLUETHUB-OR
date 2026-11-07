import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import parentQuizService, { type ParentQuizSummaryDto } from "@/services/parent-quiz";

/**
 * "From your parent" teaser for the student dashboard. Hides itself entirely
 * when there's nothing pending or in progress to act on.
 */
export function ParentQuizDashboardCard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<ParentQuizSummaryDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    parentQuizService
      .getMyQuizzes()
      .then((res) => {
        if (!cancelled) setQuizzes(res.data?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setQuizzes([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;
  const actionable = quizzes.filter((q) => q.status !== "Completed");
  if (actionable.length === 0) return null;

  const latest = [...actionable].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <button
      type="button"
      onClick={() => navigate("/student/parent-quiz")}
      className="flex w-full items-center gap-3 rounded-2xl border border-pink-100 bg-pink-50/60 p-4 text-left shadow-sm transition-colors hover:border-pink-200"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
        <Heart className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {actionable.length === 1 ? "Your parent set you a practice quiz" : `${actionable.length} practice quizzes from your parent`}
        </p>
        <p className="truncate text-xs text-slate-500">{latest.title}</p>
      </div>
    </button>
  );
}

export default ParentQuizDashboardCard;
