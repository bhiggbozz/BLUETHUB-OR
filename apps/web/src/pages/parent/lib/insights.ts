import type { AttendanceHistoryItem } from "@/services/attendance";
import { startOfDay, toLocalIsoDate } from "./format";

/**
 * Pure, deterministic summaries of a child's recorded attendance history.
 * Nothing here is predictive: every number is counted from real records,
 * and the UI always says how many sessions a summary is based on.
 */

export interface SubjectSummary {
  name: string;
  total: number;
  present: number;
  rate: number;
}

export interface DayBucket {
  key: string;
  date: Date;
  total: number;
  present: number;
}

export type InsightTone = "positive" | "neutral" | "attention";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  rate: number | null;
  streak: number;
  lastAbsence: AttendanceHistoryItem | null;
  bySubject: SubjectSummary[];
  days: Map<string, DayBucket>;
  recentRate: number | null;
  previousRate: number | null;
  insights: Insight[];
}

export const sessionTitle = (item: AttendanceHistoryItem) =>
  item.subjectName || item.subTopicName || item.classroomName || item.attendanceTypeName || "Session";

const rateOf = (present: number, total: number) => (total === 0 ? null : Math.round((present / total) * 100));

const MIN_SESSIONS_FOR_SUBJECT = 3;
const MIN_SESSIONS_FOR_TREND = 3;
const TREND_WINDOW_DAYS = 14;

export function sortNewestFirst(history: AttendanceHistoryItem[]) {
  return [...history]
    .filter((h) => h.startedAt)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function summarizeAttendance(history: AttendanceHistoryItem[]): AttendanceSummary {
  const sorted = sortNewestFirst(history);

  const total = sorted.length;
  const present = sorted.filter((h) => h.isPresent).length;
  const absent = total - present;

  let streak = 0;
  for (const h of sorted) {
    if (!h.isPresent) break;
    streak += 1;
  }

  const lastAbsence = sorted.find((h) => !h.isPresent) ?? null;

  const subjectMap = new Map<string, { total: number; present: number }>();
  const days = new Map<string, DayBucket>();
  const today = startOfDay(new Date()).getTime();
  let recentTotal = 0;
  let recentPresent = 0;
  let prevTotal = 0;
  let prevPresent = 0;

  for (const h of sorted) {
    const date = new Date(h.startedAt);
    if (h.subjectName) {
      const s = subjectMap.get(h.subjectName) ?? { total: 0, present: 0 };
      s.total += 1;
      if (h.isPresent) s.present += 1;
      subjectMap.set(h.subjectName, s);
    }

    const key = toLocalIsoDate(date);
    const bucket = days.get(key) ?? { key, date: startOfDay(date), total: 0, present: 0 };
    bucket.total += 1;
    if (h.isPresent) bucket.present += 1;
    days.set(key, bucket);

    const ageDays = Math.floor((today - startOfDay(date).getTime()) / 86_400_000);
    if (ageDays < TREND_WINDOW_DAYS) {
      recentTotal += 1;
      if (h.isPresent) recentPresent += 1;
    } else if (ageDays < TREND_WINDOW_DAYS * 2) {
      prevTotal += 1;
      if (h.isPresent) prevPresent += 1;
    }
  }

  const bySubject = [...subjectMap.entries()]
    .map(([name, s]) => ({ name, ...s, rate: rateOf(s.present, s.total) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  const recentRate = recentTotal >= MIN_SESSIONS_FOR_TREND ? rateOf(recentPresent, recentTotal) : null;
  const previousRate = prevTotal >= MIN_SESSIONS_FOR_TREND ? rateOf(prevPresent, prevTotal) : null;

  const summary: AttendanceSummary = {
    total,
    present,
    absent,
    rate: rateOf(present, total),
    streak,
    lastAbsence,
    bySubject,
    days,
    recentRate,
    previousRate,
    insights: [],
  };
  summary.insights = buildInsights(summary);
  return summary;
}

function buildInsights(s: AttendanceSummary): Insight[] {
  const out: Insight[] = [];
  if (s.total === 0) return out;

  if (s.recentRate !== null && s.previousRate !== null) {
    const delta = s.recentRate - s.previousRate;
    if (delta <= -10) {
      out.push({
        id: "trend-down",
        tone: "attention",
        title: `Attendance dipped to ${s.recentRate}% in the last two weeks`,
        detail: `Down from ${s.previousRate}% in the two weeks before. It may be worth a conversation.`,
      });
    } else if (delta >= 10) {
      out.push({
        id: "trend-up",
        tone: "positive",
        title: `Attendance rose to ${s.recentRate}% in the last two weeks`,
        detail: `Up from ${s.previousRate}% in the two weeks before.`,
      });
    }
  }

  if (s.streak >= 5) {
    out.push({
      id: "streak",
      tone: "positive",
      title: `Present for the last ${s.streak} sessions in a row`,
      detail: "A steady run. Consistency like this makes lessons easier to follow.",
    });
  }

  const weakest = s.bySubject
    .filter((sub) => sub.total >= MIN_SESSIONS_FOR_SUBJECT && sub.rate < 75)
    .sort((a, b) => a.rate - b.rate)[0];
  if (weakest) {
    out.push({
      id: `subject-${weakest.name}`,
      tone: "attention",
      title: `${weakest.name} has the lowest attendance at ${weakest.rate}%`,
      detail: `Present for ${weakest.present} of ${weakest.total} recorded ${weakest.name} sessions.`,
    });
  }

  if (out.length === 0 && s.rate !== null) {
    out.push({
      id: "overall",
      tone: s.rate >= 90 ? "positive" : s.rate >= 75 ? "neutral" : "attention",
      title: `Present for ${s.present} of ${s.total} recorded sessions`,
      detail:
        s.rate >= 90
          ? "Attendance is strong overall."
          : s.rate >= 75
            ? "Attendance is fair. A few sessions were missed."
            : "Several sessions were missed. The attendance page shows which ones.",
    });
  }

  return out.slice(0, 3);
}
