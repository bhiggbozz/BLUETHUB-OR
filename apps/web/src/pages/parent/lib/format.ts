import { AxiosError } from "axios";
import type { ParentChild } from "@/services/parent";

/** Pulls the most useful message out of an API/axios error. */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { responseMessage?: string; message?: string } | undefined;
    return data?.responseMessage || data?.message || err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const childName = (c: Pick<ParentChild, "firstName" | "lastName">) =>
  `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Your child";

export const initialsOf = (first?: string | null, last?: string | null) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";

const pad = (n: number) => String(n).padStart(2, "0");

/** yyyy-MM-dd in the viewer's local time zone (avoids the UTC off-by-one of toISOString). */
export const toLocalIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

/** yyyy-MM for `offset` months before the current one. */
export const monthKey = (offset = 0) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function dayLabel(date: Date): string {
  const today = startOfDay(new Date()).getTime();
  const t = startOfDay(date).getTime();
  const diff = Math.round((today - t) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export const timeLabel = (date: Date) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const shortDate = (date: Date) => date.toLocaleDateString(undefined, { day: "numeric", month: "short" });

export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const plural = (n: number, word: string, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;

/** True on macOS / iOS — used only to label keyboard shortcuts. */
export const isApplePlatform = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
