export interface QuizConfig {
  allowRetakes: boolean;
  maxAttempts: number;
  passMarkPercent: number;
  timeLimitMinutes: number | null;
  autoSubmitOnTimeout: boolean;
  shuffleQuestions: boolean;
  showResultMode: string;
  showCorrectAnswers: boolean;
  allowBoardAnswer: boolean;
  easyMarks: number;
  mediumMarks: number;
  hardMarks: number;
  examLevelMarks: number;
}

export interface QuizAttemptStatus {
  hasInProgressAttempt: boolean;
  inProgressAttemptId: string | null;
  completedAttempts: number;
  maxAttemptsReached: boolean;
  canStart: boolean;
}

export interface Quiz {
  quizCode: string;
  lessonTitle: string;
  totalQuestions: number;
  totalMarks: number;
  config: QuizConfig;
  attemptStatus: QuizAttemptStatus;
  bestScorePercent: number | null;
  bestIsPassed: boolean;
}

export interface PerformanceStats {
  averageScore: number | null;
  attemptCount: number;
  position: number | null;
  totalStudents: number;
}

export interface ActivityItem {
  id: string;
  label: string;
  highlight: string;
  timestamp: string;
  dotColor: "green" | "blue" | "orange";
}

export interface ContinueLearning {
  topicLabel: string;
  title: string;
  subtitleMeta: string;
  durationMinutes: number;
}

export interface SubTopic {
  id: string;
  name: string;
  topicId: string;
  isActive: boolean;
}

export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  subTopics: SubTopic[];
}

export interface CoursePerformance {
  quiz: PerformanceStats;
  assessment: PerformanceStats;
}



export type QuizStatus = "pass" | "fail" | "available" | "locked";

export function getQuizStatus(quiz: Quiz): QuizStatus {
  // A quiz with no questions can't be taken, whatever canStart says.
  if (quiz.totalQuestions === 0) return "locked";

  if (quiz.attemptStatus.completedAttempts > 0) {
    return quiz.bestIsPassed ? "pass" : "fail";
  }

  return "available";
}