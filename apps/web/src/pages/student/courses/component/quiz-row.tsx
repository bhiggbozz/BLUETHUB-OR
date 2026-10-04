import { cn } from "@/lib/utils";
import { Badge, Button, Card, CardContent } from "@bluethub/ui-kit";
import { Clock, FileText, Lock } from "lucide-react";
import type { Quiz } from "../interfaces";



function QuizRow({ quiz }: { quiz: Quiz }) {
  const isLocked = quiz.status === "locked";

  return (
    <Card className="border-none shadow-sm p-0">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg",
            isLocked ? "bg-amber-100" : "bg-blue-100"
          )}
        >
          {isLocked ? "🔒" : "🌎"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{quiz.title}</p>
          <div className="flex flex-wrap items-center text-xs text-muted-foreground sm:text-sm">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {quiz.durationMinutes} mins
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> {quiz.questionCount} questions
            </span>
            {quiz.tag && <span>{quiz.tag}</span>}
          </div>
          <div className="mt-1.5">
            {quiz.status === "pass" && (
              <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                {quiz.scorePercent}% · Pass ✓
              </Badge>
            )}
            {quiz.status === "fail" && (
              <Badge className="rounded-full bg-rose-100 text-rose-700 hover:bg-rose-100">
                {quiz.scorePercent}% · Fail
              </Badge>
            )}
            {quiz.status === "available" && (
              <Badge className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100">Available Now</Badge>
            )}
            {quiz.status === "locked" && (
              <Badge variant="secondary" className="rounded-full text-muted-foreground">
                {quiz.helperText}
              </Badge>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {quiz.status === "pass" && (
            <Button variant="secondary" size="sm" disabled>
              Review
            </Button>
          )}
          {quiz.status === "fail" && (
            <Button size="sm" className="bg-rose-500 hover:bg-rose-600">
              Retry
            </Button>
          )}
          {quiz.status === "available" && (
            <Button size="sm" className="bg-[#292382] hover:bg-[#221d6b]">
              Start Quiz
            </Button>
          )}
          {quiz.status === "locked" && (
            <Button size="sm" variant="secondary" disabled>
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Locked
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default QuizRow