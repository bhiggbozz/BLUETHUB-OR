import { differenceInCalendarDays, format, parse } from "date-fns";
import type { CalendarSessionDto, CalendarTermDto, CalendarTermPayload } from "@/services/calendar";

// All calendar dates are plain "yyyy-MM-dd" strings, both in state/requests and
// from the server. Never `new Date("yyyy-MM-dd")` — that parses as UTC and can
// shift a day depending on the viewer's timezone. Always go through these.

const ISO_FORMAT = "yyyy-MM-dd";

export function parseLocalDate(iso: string): Date {
  return parse(iso, ISO_FORMAT, new Date());
}

export function formatLocalDate(date: Date): string {
  return format(date, ISO_FORMAT);
}

export function todayISO(): string {
  return formatLocalDate(new Date());
}

/** "yyyy-MM-dd" strings compare correctly as plain text. */
export function compareISO(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function isBeforeISO(a: string, b: string): boolean {
  return compareISO(a, b) < 0;
}

export function isWithinInclusive(dateISO: string, startISO: string, endISO: string): boolean {
  return compareISO(dateISO, startISO) >= 0 && compareISO(dateISO, endISO) <= 0;
}

/** Inclusive day count between two "yyyy-MM-dd" strings (same day = 1). */
export function daysInclusive(startISO: string, endISO: string): number {
  return differenceInCalendarDays(parseLocalDate(endISO), parseLocalDate(startISO)) + 1;
}

export function weeksFromDays(days: number): number {
  return Math.ceil(days / 7);
}

export function termLengthWeeks(term: { startDate: string; endDate: string }): number {
  return weeksFromDays(daysInclusive(term.startDate, term.endDate));
}

/** Calendar days remaining from `fromISO` to `toISO` (negative if already past). */
export function daysUntil(fromISO: string, toISO: string): number {
  return differenceInCalendarDays(parseLocalDate(toISO), parseLocalDate(fromISO));
}

/** "Week N of total" for a term currently in progress, clamped to [1, total]. */
export function currentWeekOf(term: { startDate: string; endDate: string }, onISO: string): { week: number; total: number } {
  const total = termLengthWeeks(term);
  const elapsedDays = daysInclusive(term.startDate, onISO);
  const week = Math.min(Math.max(weeksFromDays(Math.max(elapsedDays, 1)), 1), total);
  return { week, total };
}

// ── Display formatting ─────────────────────────────────────────────────────────

const DAY_MONTH = "d MMM";
const DAY_MONTH_YEAR = "d MMM yyyy";

export function formatDisplayDate(iso: string): string {
  return format(parseLocalDate(iso), DAY_MONTH_YEAR);
}

/** "7 Sep to 18 Dec 2026" (drops the start year when it matches the end year). */
export function formatDisplayRange(startISO: string, endISO: string): string {
  const start = parseLocalDate(startISO);
  const end = parseLocalDate(endISO);
  const sameYear = format(start, "yyyy") === format(end, "yyyy");
  const startLabel = format(start, sameYear ? DAY_MONTH : DAY_MONTH_YEAR);
  const endLabel = format(end, DAY_MONTH_YEAR);
  return `${startLabel} to ${endLabel}`;
}

/** "3 Mar – 7 Mar 2027" (en dash); a single-day entry shows just "3 Mar 2027". */
export function formatEntryRange(startISO: string, endISO: string): string {
  if (startISO === endISO) return formatDisplayDate(startISO);
  const start = parseLocalDate(startISO);
  const end = parseLocalDate(endISO);
  const sameYear = format(start, "yyyy") === format(end, "yyyy");
  const startLabel = format(start, sameYear ? DAY_MONTH : DAY_MONTH_YEAR);
  const endLabel = format(end, DAY_MONTH_YEAR);
  return `${startLabel} – ${endLabel}`;
}

/** Local time, e.g. "29 Oct 2026, 14:05" — changedAt is a UTC ISO timestamp. */
export function formatLocalDateTime(isoTimestamp: string): string {
  return format(new Date(isoTimestamp), "d MMM yyyy, HH:mm");
}

// ── Session selection ──────────────────────────────────────────────────────────

/** Current session if any, else the earliest Upcoming, else the newest Past. */
export function pickDefaultSession(sessions: CalendarSessionDto[]): CalendarSessionDto | null {
  if (sessions.length === 0) return null;
  const current = sessions.find((s) => s.status === "Current");
  if (current) return current;

  const upcoming = sessions.filter((s) => s.status === "Upcoming").sort((a, b) => compareISO(a.startDate, b.startDate));
  if (upcoming.length > 0) return upcoming[0];

  const past = sessions.filter((s) => s.status === "Past").sort((a, b) => compareISO(b.startDate, a.startDate));
  if (past.length > 0) return past[0];

  // Sessions list is non-empty but nothing matched a known status — fall back
  // to the newest by start date rather than showing nothing.
  return [...sessions].sort((a, b) => compareISO(b.startDate, a.startDate))[0];
}

// ── Gaps between terms (for the timeline's "Break, N weeks" bands) ────────────

export interface TermGap {
  startDate: string;
  endDate: string;
  weeks: number;
}

/** Gaps of 7+ days between consecutive terms, sorted by start date. */
export function findGaps(terms: CalendarTermDto[]): TermGap[] {
  const sorted = [...terms].sort((a, b) => compareISO(a.startDate, b.startDate));
  const gaps: TermGap[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].endDate;
    const nextStart = sorted[i].startDate;
    const gapDays = daysInclusive(prevEnd, nextStart) - 2; // days strictly between
    if (gapDays >= 7) {
      const gapStart = formatLocalDate(addDays(parseLocalDate(prevEnd), 1));
      const gapEnd = formatLocalDate(addDays(parseLocalDate(nextStart), -1));
      gaps.push({ startDate: gapStart, endDate: gapEnd, weeks: weeksFromDays(gapDays) });
    }
  }
  return gaps;
}

function addDays(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

// ── Validation (mirrors the server; the server stays authoritative) ───────────

export const MAX_SESSION_DAYS = 550;
export const MAX_SESSION_NAME_LENGTH = 100;
export const MAX_TERM_NAME_LENGTH = 100;
export const MIN_TERMS = 1;
export const MAX_TERMS = 6;

export interface SessionFormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
}

export function validateSessionFields(input: { name: string; startDate: string; endDate: string }): SessionFormErrors {
  const errors: SessionFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "Session name is required.";
  } else if (input.name.trim().length > MAX_SESSION_NAME_LENGTH) {
    errors.name = `Session name must be ${MAX_SESSION_NAME_LENGTH} characters or fewer.`;
  }

  if (!input.startDate) errors.startDate = "Start date is required.";
  if (!input.endDate) errors.endDate = "End date is required.";

  if (input.startDate && input.endDate) {
    if (isBeforeISO(input.endDate, input.startDate)) {
      errors.endDate = "End date can't be before the start date.";
    } else if (daysInclusive(input.startDate, input.endDate) > MAX_SESSION_DAYS) {
      errors.endDate = `An academic year can't be longer than ${MAX_SESSION_DAYS} days.`;
    }
  }

  return errors;
}

export interface TermRowErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  overlap?: string;
}

/**
 * Validates term rows against each other and against the enclosing session
 * window. Returns one error set per row (by array index) plus a general
 * message for count violations.
 */
export function validateTerms(
  terms: CalendarTermPayload[],
  session: { startDate: string; endDate: string },
): { rowErrors: TermRowErrors[]; generalError: string | null } {
  const rowErrors: TermRowErrors[] = terms.map(() => ({}));
  let generalError: string | null = null;

  if (terms.length < MIN_TERMS) {
    generalError = "Add at least one term.";
  } else if (terms.length > MAX_TERMS) {
    generalError = `A session can have at most ${MAX_TERMS} terms.`;
  }

  terms.forEach((term, idx) => {
    const errors: TermRowErrors = {};
    if (!term.name.trim()) {
      errors.name = "Term name is required.";
    } else if (term.name.trim().length > MAX_TERM_NAME_LENGTH) {
      errors.name = `Term name must be ${MAX_TERM_NAME_LENGTH} characters or fewer.`;
    }

    if (!term.startDate) errors.startDate = "Start date is required.";
    if (!term.endDate) errors.endDate = "End date is required.";

    if (term.startDate && term.endDate && isBeforeISO(term.endDate, term.startDate)) {
      errors.endDate = "End date can't be before the start date.";
    }

    if (term.startDate && session.startDate && isBeforeISO(term.startDate, session.startDate)) {
      errors.startDate = "Term starts before the session begins.";
    }
    if (term.endDate && session.endDate && isBeforeISO(session.endDate, term.endDate)) {
      errors.endDate = "Term ends after the session ends.";
    }

    rowErrors[idx] = errors;
  });

  // Duplicate names (case-insensitive).
  const seenNames = new Map<string, number>();
  terms.forEach((term, idx) => {
    const key = term.name.trim().toLowerCase();
    if (!key) return;
    if (seenNames.has(key)) {
      rowErrors[idx].name = rowErrors[idx].name ?? "Term names must be unique.";
      rowErrors[seenNames.get(key)!].name = rowErrors[seenNames.get(key)!].name ?? "Term names must be unique.";
    } else {
      seenNames.set(key, idx);
    }
  });

  // Overlap check — sort by start date, then any term that starts on or
  // before the previous term's end date overlaps it (dates are inclusive).
  const withDates = terms
    .map((term, idx) => ({ term, idx }))
    .filter((t) => t.term.startDate && t.term.endDate);
  const sorted = [...withDates].sort((a, b) => compareISO(a.term.startDate, b.term.startDate));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (compareISO(curr.term.startDate, prev.term.endDate) <= 0) {
      const message = "This term overlaps another term.";
      rowErrors[curr.idx].overlap = message;
      rowErrors[prev.idx].overlap = message;
    }
  }

  return { rowErrors, generalError };
}

export function hasAnyTermErrors(rowErrors: TermRowErrors[], generalError: string | null): boolean {
  if (generalError) return true;
  return rowErrors.some((e) => e.name || e.startDate || e.endDate || e.overlap);
}

// ── Entry validation (mirrors the server; the server stays authoritative) ────

export const MAX_ENTRY_TITLE_LENGTH = 100;
export const MAX_ENTRY_DESCRIPTION_LENGTH = 500;

export interface EntryFormErrors {
  title?: string;
  entryType?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  scope?: string;
}

/**
 * `bounds` is the whole academic year for an admin entry, or a single term
 * for anyone else — non-admins must keep their entry inside one term.
 */
export function validateEntryFields(
  input: { title: string; entryType: string; description?: string; startDate: string; endDate: string },
  bounds: { startDate: string; endDate: string },
): EntryFormErrors {
  const errors: EntryFormErrors = {};

  if (!input.title.trim()) {
    errors.title = "Title is required.";
  } else if (input.title.trim().length > MAX_ENTRY_TITLE_LENGTH) {
    errors.title = `Title must be ${MAX_ENTRY_TITLE_LENGTH} characters or fewer.`;
  }

  if (!input.entryType) errors.entryType = "Choose a type.";

  if ((input.description?.length ?? 0) > MAX_ENTRY_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_ENTRY_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  if (!input.startDate) errors.startDate = "Start date is required.";
  if (!input.endDate) errors.endDate = "End date is required.";

  if (input.startDate && input.endDate) {
    if (isBeforeISO(input.endDate, input.startDate)) {
      errors.endDate = "End date can't be before the start date.";
    } else if (daysInclusive(input.startDate, input.endDate) > 366) {
      errors.endDate = "An entry can't be longer than a year.";
    }
  }

  if (input.startDate && bounds.startDate && isBeforeISO(input.startDate, bounds.startDate)) {
    errors.startDate = "Starts before the allowed range.";
  }
  if (input.endDate && bounds.endDate && isBeforeISO(bounds.endDate, input.endDate)) {
    errors.endDate = "Ends after the allowed range.";
  }

  return errors;
}

export function hasAnyEntryErrors(errors: EntryFormErrors): boolean {
  return !!(errors.title || errors.entryType || errors.startDate || errors.endDate || errors.description || errors.scope);
}

/** The term whose range fully contains the given date, if any. */
export function findTermForDate(terms: CalendarTermDto[], dateISO: string): CalendarTermDto | undefined {
  return terms.find((t) => isWithinInclusive(dateISO, t.startDate, t.endDate));
}
