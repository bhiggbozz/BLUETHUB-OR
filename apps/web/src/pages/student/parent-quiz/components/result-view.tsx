import { useNavigate } from "react-router-dom";
import { Button } from "@bluethub/ui-kit";
import type { ParentQuizResultDto } from "@/services/parent-quiz";
import { QuizResultQuestion } from "@/component/quiz-result-question";

export function ParentQuizResultView({ result }: { result: ParentQuizResultDto }) {
  const navigate = useNavigate();
  const passed = result.quiz.isPassed;
  return (
    <div className="mx-auto max-w-[900px] space-y-5 p-4 md:p-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className={`text-2xl font-bold ${passed ? "text-emerald-600" : "text-rose-600"}`}>
          {Math.round(result.quiz.scorePercent ?? 0)}%
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          {result.totalCorrect}/{result.totalQuestions} correct
        </p>
        <p className={`mt-2 text-sm font-semibold ${passed ? "text-emerald-600" : "text-amber-600"}`}>
          {passed ? "Well done — you passed!" : "Good try. Look at the ones you missed and try again with your parent."}
        </p>
      </div>

      <div className="space-y-4">
        {result.questions.map((q) => (
          <QuizResultQuestion key={q.questionId} question={q} perspective="student" />
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={() => navigate("/student/parent-quiz")} className="rounded-full bg-[#4255db] px-6 text-sm font-semibold text-white hover:bg-[#3447cc]">
          Back to list
        </Button>
      </div>
    </div>
  );
}

export default ParentQuizResultView;
