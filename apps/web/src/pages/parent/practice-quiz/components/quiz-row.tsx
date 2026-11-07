import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, PlayCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParentQuizStatus, ParentQuizSummaryDto } from "@/services/parent-quiz";
import { Badge, type Tone } from "../../component/ui/feedback";
import { Button } from "../../component/ui/button";
import { dayLabel } from "../../lib/format";

const STATUS_META: Record<ParentQuizStatus, { label: string; icon: typeof Clock3; tone: Tone }> = {
  Pending: { label: "Waiting", icon: Clock3, tone: "neutral" },
  InProgress: { label: "In progress", icon: PlayCircle, tone: "warn" },
  Completed: { label: "Completed", icon: CheckCircle2, tone: "present" },
};

interface QuizRowProps {
  quiz: ParentQuizSummaryDto;
  onCancel: (quiz: ParentQuizSummaryDto) => void;
}

export function QuizRow({ quiz, onCancel }: QuizRowProps) {
  const navigate = useNavigate();
  const meta = STATUS_META[quiz.status];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-(--pp-line) bg-(--pp-surface) p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-(--pp-text)">{quiz.title}</p>
          <Badge tone={meta.tone} icon={<meta.icon className="size-3" />}>
            {meta.label}
          </Badge>
        </div>
        <p className="mt-1 text-[12px] text-(--pp-subtle)">
          {quiz.subjectName}
          {quiz.topicNames ? ` · ${quiz.topicNames}` : ""} · {quiz.questionCount} question{quiz.questionCount === 1 ? "" : "s"} ·{" "}
          {dayLabel(new Date(quiz.createdAt))}
        </p>
        {quiz.status === "Completed" && quiz.scorePercent !== null && (
          <p className={cn("mt-1 text-[13px] font-semibold", quiz.isPassed ? "text-(--pp-present)" : "text-(--pp-absent)")}>
            {quiz.totalCorrect}/{quiz.questionCount} · {Math.round(quiz.scorePercent)}% · {quiz.isPassed ? "Passed" : "Not passed"}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {quiz.status === "Pending" && (
          <Button variant="secondary" size="sm" icon={<X className="size-3.5" />} onClick={() => onCancel(quiz)}>
            Cancel
          </Button>
        )}
        {quiz.status === "Completed" && (
          <Button variant="secondary" size="sm" onClick={() => navigate(`/parent/practice-quiz/${quiz.id}`)}>
            View review
          </Button>
        )}
      </div>
    </div>
  );
}

export default QuizRow;
