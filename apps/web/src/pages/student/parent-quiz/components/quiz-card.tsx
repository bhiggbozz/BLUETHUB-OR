import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@bluethub/ui-kit";
import { CheckCircle2, Clock, PlayCircle, Sparkles } from "lucide-react";
import type { ParentQuizSummaryDto } from "@/services/parent-quiz";

interface QuizCardProps {
  quiz: ParentQuizSummaryDto;
}

export function QuizCard({ quiz }: QuizCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-lg">
          🧩
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-800">{quiz.title}</p>
            {quiz.status === "Pending" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                <Sparkles className="h-3 w-3" /> New
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            Set by {quiz.parentName} · {quiz.subjectName}
            {quiz.topicNames ? ` · ${quiz.topicNames}` : ""}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            {quiz.questionCount} question{quiz.questionCount === 1 ? "" : "s"}
            {quiz.timeLimitMinutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {quiz.timeLimitMinutes} min
              </span>
            )}
          </p>
          {quiz.status === "Completed" && quiz.scorePercent !== null && (
            <p className={`mt-1 text-xs font-semibold ${quiz.isPassed ? "text-emerald-600" : "text-rose-500"}`}>
              {quiz.totalCorrect}/{quiz.questionCount} · {Math.round(quiz.scorePercent)}%
            </p>
          )}
        </div>

        <div className="shrink-0">
          {quiz.status === "Pending" && (
            <button
              type="button"
              onClick={() => navigate(`/student/parent-quiz/${quiz.id}`)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#4255db] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3447cc]"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Start
            </button>
          )}
          {quiz.status === "InProgress" && (
            <button
              type="button"
              onClick={() => navigate(`/student/parent-quiz/${quiz.id}`)}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Continue
            </button>
          )}
          {quiz.status === "Completed" && (
            <button
              type="button"
              onClick={() => navigate(`/student/parent-quiz/${quiz.id}/result`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> See result
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default QuizCard;
