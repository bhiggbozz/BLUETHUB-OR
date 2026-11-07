import { format, parse } from "date-fns";
import type { SegmentOption } from "../component/ui/segmented";
import type { ParentQuizMode, ParentQuizSettingsDto, ParentQuizSubjectDto } from "@/services/parent-quiz";

export const MODE_LABEL: Record<ParentQuizMode, string> = {
  Mix: "Mixed",
  Easy: "Easy",
  Medium: "Medium",
  Hard: "Hard",
  ExamLevel: "Exam level",
};

export const MODE_OPTIONS: SegmentOption<ParentQuizMode>[] = [
  { value: "Mix", label: "Mix" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
  { value: "ExamLevel", label: "Exam" },
];

export const MIN_QUESTIONS = 5;

export function summarizeSettings(s: Pick<ParentQuizSettingsDto, "questionCount" | "mode" | "timeLimitMinutes">): string {
  const parts = [
    `${s.questionCount} question${s.questionCount === 1 ? "" : "s"}`,
    `${MODE_LABEL[s.mode]} difficulty`,
    s.timeLimitMinutes ? `${s.timeLimitMinutes} min limit` : "No time limit",
  ];
  return parts.join(" · ");
}

const ISO_DATE = "yyyy-MM-dd";

/** Parses a yyyy-MM-dd string as a local date — `new Date("yyyy-MM-dd")` parses as UTC and can shift a day. */
export function parseTaughtDate(iso: string): Date {
  return parse(iso, ISO_DATE, new Date());
}

export function formatTaughtDate(iso: string): string {
  return format(parseTaughtDate(iso), "d MMM yyyy");
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes} min ${seconds} s`;
}

// ── Sub-topic selection (create screen) ──────────────────────────────────────
// Picking is independent of what's been taught — it comes straight from the
// full syllabus returned by GET /api/parent-quiz/children/{id}/subjects.
// Selection is tracked as two id sets: wholeTopicIds (topics with no
// sub-topics of their own — the whole topic is the smallest unit) and
// subTopicIds (specific sub-topics picked within topics that have them).
// Both empty = "whole subject", the default one-click path.

export interface SubjectSelection {
  topicIds: Set<string>;
  subTopicIds: Set<string>;
}

export const emptySelection = (): SubjectSelection => ({ topicIds: new Set(), subTopicIds: new Set() });

export const isSelectionEmpty = (selection: SubjectSelection): boolean =>
  selection.topicIds.size === 0 && selection.subTopicIds.size === 0;

/** Sum of what's actually selected, or the whole subject's total when nothing is. */
export function computeSelectedTotal(subject: ParentQuizSubjectDto, selection: SubjectSelection): number {
  if (isSelectionEmpty(selection)) return subject.available.total;

  let total = 0;
  for (const topic of subject.topics) {
    if (selection.topicIds.has(topic.topicId)) {
      total += topic.available.total;
      continue;
    }
    for (const subTopic of topic.subTopics ?? []) {
      if (selection.subTopicIds.has(subTopic.subTopicId)) total += subTopic.available.total;
    }
  }
  return total;
}

/** Every selectable sub-topic id under a topic with at least MIN_QUESTIONS available. */
export function selectableSubTopicIds(topic: ParentQuizSubjectDto["topics"][number]): string[] {
  return (topic.subTopics ?? []).filter((s) => s.available.total >= MIN_QUESTIONS).map((s) => s.subTopicId);
}

/** Looks up a specific sub-topic's availability for the "Set a quiz on this" shortcut
 * from the "What was taught" screen — null when it isn't in the picker at all
 * (no practice questions for it yet). */
export function findSubTopicAvailable(
  subjects: ParentQuizSubjectDto[] | undefined,
  subjectId: string,
  subTopicId: string,
): number | null {
  const subject = subjects?.find((s) => s.subjectId === subjectId);
  for (const topic of subject?.topics ?? []) {
    const match = (topic.subTopics ?? []).find((s) => s.subTopicId === subTopicId);
    if (match) return match.available.total;
  }
  return null;
}
