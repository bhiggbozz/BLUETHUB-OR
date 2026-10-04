
import { useEffect } from "react";
import PerformanceOverview from "./performance-overview";
import QuizRow from "./quiz-row";

interface Quiz {
  id: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  tag?: string;
  status: QuizStatus;
  scorePercent?: number;
  helperText?: string;
}

type QuizStatus = "pass" | "fail" | "available" | "locked";


function AssessmentsTab() {
  const quizzes: Quiz[] = [
    {
      id: "q1",
      title: "Topic 1 — End of Topic Quiz",
      durationMinutes: 15,
      questionCount: 20,
      tag: "Living Things",
      status: "pass",
      scorePercent: 85,
    },
    {
      id: "q2",
      title: "Topic 2 — Mid-Topic Check",
      durationMinutes: 10,
      questionCount: 15,
      tag: "Solar System",
      status: "available",
    },
    {
      id: "q3",
      title: "Topic 1 — Mid-Topic Check",
      durationMinutes: 10,
      questionCount: 15,
      tag: "Solar System",
      status: "fail",
      scorePercent: 48,
    },
    {
      id: "q4",
      title: "Topic 2 — End of Topic Quiz",
      durationMinutes: 15,
      questionCount: 20,
      status: "locked",
      helperText: "Complete Topic 2 first",
    },
    {
      id: "q5",
      title: "Topic 3 — Matter Quiz",
      durationMinutes: 15,
      questionCount: 20,
      status: "locked",
      helperText: "Locked",
    },
    {
      id: "q6",
      title: "Mid-Term Examination",
      durationMinutes: 45,
      questionCount: 50,
      tag: "All Topics",
      status: "locked",
      helperText: "Locked",
    },
  ];

  const active = quizzes.filter((q) => q.status !== "locked");
  const locked = quizzes.filter((q) => q.status === "locked");


  useEffect(() => {

  }, [])

  return (
    <div className="space-y-6">
      <PerformanceOverview />

      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-sm font-medium sm:text-base">Assessments &amp; Quizzes</span>
          <span className="text-xs font-medium text-[#292382] sm:text-sm">{quizzes.length} Total</span>
        </div>
        <div className="space-y-3">
          {active.map((quiz) => (
            <QuizRow key={quiz.id} quiz={quiz} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 px-1 text-sm font-semibold text-muted-foreground sm:text-base">Upcoming — locked</p>
        <div className="space-y-3">
          {locked.map((quiz) => (
            <QuizRow key={quiz.id} quiz={quiz} />
          ))}
        </div>
      </div>
    </div>
  );
}


export default AssessmentsTab