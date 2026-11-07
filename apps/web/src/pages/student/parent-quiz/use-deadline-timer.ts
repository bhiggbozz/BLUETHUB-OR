import { useEffect, useRef, useState } from "react";

// Announce politely only at 5 min, 1 min and 10 s left — not every second.
const ANNOUNCE_THRESHOLDS = [300, 60, 10];

function formatThreshold(seconds: number): string {
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"} remaining`;
  }
  return `${seconds} seconds remaining`;
}

/** Counts down to startedAt + timeLimitMinutes using the server's clock, so a
 * resumed attempt reflects time already used instead of restarting the clock. */
export function useDeadlineTimer(startedAt: string | null, timeLimitMinutes: number | null, onTimeUp: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const announcedRef = useRef<Set<number>>(new Set());
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (!startedAt || !timeLimitMinutes) {
      setSecondsLeft(null);
      return;
    }
    const deadline = new Date(startedAt).getTime() + timeLimitMinutes * 60_000;
    announcedRef.current = new Set();
    firedRef.current = false;

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      for (const threshold of ANNOUNCE_THRESHOLDS) {
        if (remaining <= threshold && !announcedRef.current.has(threshold)) {
          announcedRef.current.add(threshold);
          setAnnouncement(formatThreshold(threshold));
        }
      }
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        onTimeUpRef.current();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, timeLimitMinutes]);

  const formatted =
    secondsLeft === null
      ? null
      : `${Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  return { secondsLeft, formatted, announcement };
}
