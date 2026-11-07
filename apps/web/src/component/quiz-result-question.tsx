import { Check, MinusCircle, X } from "lucide-react";
import { RichContent } from "./rich-content";

// Shared review layout for a single answered question — used by the parent's
// quiz review and the student's own result screen for parent-set practice
// quizzes. Correctness is always shown with an icon + text + border, never
// colour alone. `perspective` only changes the wording ("You" vs "Your child").

export interface ReviewOption {
  optionId: string;
  optionLabel: string;
  optionText: string;
  optionHtml: string | null;
  contentParts?: unknown;
  isCorrect: boolean;
  wasSelected: boolean;
}

export interface ReviewQuestion {
  questionId: string;
  displayOrder: number;
  title: string;
  textContent: string | null;
  questionHtml: string | null;
  contentParts?: unknown;
  imageUrl: string | null;
  difficultyLevel: number;
  isCorrect: boolean;
  isSkipped: boolean;
  options: ReviewOption[];
}

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
  4: "Expert",
};

interface QuizResultQuestionProps {
  question: ReviewQuestion;
  perspective: "parent" | "student";
}

export function QuizResultQuestion({ question, perspective }: QuizResultQuestionProps) {
  const who = perspective === "parent" ? "Your child" : "You";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">
          <span className="mr-2 text-[#4255db]">Q{question.displayOrder}.</span>
          <RichContent text={question.title} html={question.questionHtml} contentParts={question.contentParts} />
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {question.isSkipped && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <MinusCircle className="h-3 w-3" /> Not answered
            </span>
          )}
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {DIFFICULTY_LABEL[question.difficultyLevel] ?? "—"}
          </span>
        </div>
      </div>

      {question.textContent && !question.questionHtml && (
        <RichContent text={question.textContent} className="mt-1.5 block text-sm text-slate-600" />
      )}

      {question.imageUrl && (
        <div className="mt-3">
          <img
            src={question.imageUrl}
            alt="Question"
            className="max-h-64 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <div className="mt-3 space-y-2">
        {question.options.map((option) => {
          const showCorrect = option.isCorrect;
          const showChosen = option.wasSelected;
          const borderCls = showChosen && !showCorrect
            ? "border-rose-300 bg-rose-50"
            : showCorrect
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 bg-slate-50";

          return (
            <div key={option.optionId} className={`rounded-lg border px-3 py-2.5 text-sm ${borderCls}`}>
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                    showCorrect
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : showChosen
                        ? "border-rose-500 bg-rose-500 text-white"
                        : "border-slate-300 bg-white text-slate-500"
                  }`}
                >
                  {option.optionLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <RichContent text={option.optionText} html={option.optionHtml} contentParts={option.contentParts} className="text-slate-700" />
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {showCorrect && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <Check className="h-3 w-3" /> Correct answer
                      </span>
                    )}
                    {showChosen && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${showCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                        {showCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {who} chose this
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default QuizResultQuestion;
