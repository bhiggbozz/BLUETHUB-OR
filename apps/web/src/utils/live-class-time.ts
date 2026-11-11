/** School time for display — WAT (UTC+1, no DST). Every timestamp from the
 * live-class API is ISO UTC ("Z"); this is purely a display concern, never
 * used for the actual countdown math (that's always server-offset-corrected
 * `Date.now()`, in UTC, regardless of how it's displayed). */
const SCHOOL_TIMEZONE = "Africa/Lagos";

export function formatWAT(iso: string): string {
  return `${new Date(iso).toLocaleString("en-GB", {
    timeZone: SCHOOL_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} (WAT)`;
}

/** `serverTime - Date.now()` — add this to `Date.now()` for the
 * server-corrected clock. Never trust the device clock directly. */
export function serverOffsetMs(serverTimeIso: string): number {
  return new Date(serverTimeIso).getTime() - Date.now();
}

export function secondsUntil(targetIso: string, offsetMs: number): number {
  return Math.round((new Date(targetIso).getTime() - (Date.now() + offsetMs)) / 1000);
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
