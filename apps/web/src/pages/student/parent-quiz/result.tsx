import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import parentQuizService, { type ParentQuizResultDto } from "@/services/parent-quiz";
import { ParentQuizResultView } from "./components/result-view";

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { responseMessage?: string; message?: string } }; message?: string };
  return e?.response?.data?.responseMessage || e?.response?.data?.message || e?.message || fallback;
}

const StudentParentQuizResult = () => {
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
      .getMyQuizResult(quizId)
      .then((res) => {
        if (!cancelled) setResult(res.data?.data ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(extractMessage(err, "The result isn't ready yet."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#4255db]" />
        <span className="text-sm">Loading your result…</span>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-lg p-4 md:p-6">
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-rose-400" />
          <p className="text-sm text-slate-600">{error ?? "Something went wrong."}</p>
          <button
            type="button"
            onClick={() => navigate("/student/parent-quiz")}
            className="rounded-full bg-[#4255db] px-5 py-2 text-sm font-semibold text-white hover:bg-[#3447cc]"
          >
            Back to list
          </button>
        </div>
      </div>
    );
  }

  return <ParentQuizResultView result={result} />;
};

export default StudentParentQuizResult;
