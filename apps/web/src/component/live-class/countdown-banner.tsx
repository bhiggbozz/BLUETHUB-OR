import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownBannerProps {
  /** ISO timestamp — when the server will end the class. */
  endsAt: string;
  /** `serverTime - Date.now()` captured at join — never trust the device clock. */
  serverOffsetMs: number;
  onEnded?: () => void;
  className?: string;
}

const formatRemaining = (totalSeconds: number): string => {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/** Self-ticking countdown — derives remaining time from the server-adjusted
 * clock every second rather than trusting a prop that only updates on hub
 * events, so it stays accurate even through a brief reconnect gap. Turns
 * amber at 5 minutes left and red at 2, matching the warnings the hub also
 * announces (this is a visual backstop, not a replacement for those toasts). */
export default function CountdownBanner({ endsAt, serverOffsetMs, onEnded, className }: CountdownBannerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    Math.round((new Date(endsAt).getTime() - (Date.now() + serverOffsetMs)) / 1000)
  );
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.round((new Date(endsAt).getTime() - (Date.now() + serverOffsetMs)) / 1000);
      setSecondsRemaining(remaining);
      if (remaining <= 0 && !hasEnded) {
        setHasEnded(true);
        onEnded?.();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, serverOffsetMs]);

  const isCritical = secondsRemaining <= 120;
  const isWarning = !isCritical && secondsRemaining <= 300;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors ${
        isCritical
          ? "bg-red-100 text-red-700"
          : isWarning
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-700"
      } ${className ?? ""}`}
      role="timer"
      aria-live="polite"
    >
      <Clock className="size-4" />
      {formatRemaining(secondsRemaining)}
      {isWarning && <span className="font-normal">· wrapping up soon</span>}
      {isCritical && <span className="font-normal">· ending very soon</span>}
    </div>
  );
}
