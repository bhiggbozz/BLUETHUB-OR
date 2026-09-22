type QuizStatus = "pass" | "fail" | "available" | "locked";

export interface Quiz {
  id: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  tag?: string;
  status: QuizStatus;
  scorePercent?: number;
  helperText?: string;
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

