import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertCircle, Heart, Loader2 } from "lucide-react";
import type { RootState } from "@/store";
import { setQuizzes } from "@/store/parent-quiz-slice";
import parentQuizService from "@/services/parent-quiz";
import { QuizCard } from "./components/quiz-card";

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { responseMessage?: string; message?: string } }; message?: string };
  return e?.response?.data?.responseMessage || e?.response?.data?.message || e?.message || fallback;
}

const StudentParentQuizList = () => {
  const dispatch = useDispatch();
  const quizzes = useSelector((s: RootState) => s.parentQuiz.quizzes);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    parentQuizService
      .getMyQuizzes()
      .then((res) => {
        if (cancelled) return;
        dispatch(setQuizzes(res.data?.data ?? []));
      })
      .catch((err) => {
        if (!cancelled) setError(extractMessage(err, "Couldn't load your practice quizzes."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const sorted = useMemo(
    () => [...quizzes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [quizzes],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
          <Heart className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-[#12122A]">From your parent</h1>
          <p className="text-xs text-slate-500">Practice quizzes your parent set just for you.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 py-14 text-center">
          <Heart className="h-7 w-7 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">Nothing here yet</p>
          <p className="max-w-xs text-xs text-slate-400">
            When your parent sets you a practice quiz it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentParentQuizList;
