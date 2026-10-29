import { useEffect, useRef } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ease } from "./motion";

/** Colour for an attendance rate. Thresholds follow common school guidance (90% = good). */
export function rateTone(rate: number | null | undefined): "present" | "warn" | "absent" | "neutral" {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return "neutral";
  if (rate >= 90) return "present";
  if (rate >= 75) return "warn";
  return "absent";
}

const toneVar = {
  present: "var(--pp-present)",
  warn: "var(--pp-warn)",
  absent: "var(--pp-absent)",
  neutral: "var(--pp-faint)",
  iris: "var(--pp-iris)",
  glow: "var(--pp-glow)",
} as const;

export type VizTone = keyof typeof toneVar;

/** Counts up to `value` once on change. Falls back to a static value when motion is reduced. */
export function AnimatedNumber({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = `${Math.round(value)}${suffix}`;
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.7,
      ease,
      onUpdate: (v) => {
        el.textContent = `${Math.round(v)}${suffix}`;
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, suffix, reduce]);

  return (
    <span ref={ref} className={cn("pp-num", className)}>
      {Math.round(value)}
      {suffix}
    </span>
  );
}

interface RateRingProps {
  rate: number | null;
  size?: number;
  stroke?: number;
  tone?: VizTone;
  trackClassName?: string;
  label?: string;
  children?: React.ReactNode;
}

/** Radial gauge. `children` render centred inside the ring. */
export function RateRing({ rate, size = 120, stroke = 10, tone, trackClassName, label, children }: RateRingProps) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const pct = Math.max(0, Math.min(100, rate ?? 0)) / 100;
  const color = toneVar[tone ?? rateTone(rate)];

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? (rate === null ? "No data" : `${rate}%`)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={cn("stroke-(--pp-line)", trackClassName)}
        />
        {rate !== null && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={{ pathLength: reduce ? pct : 0 }}
            animate={{ pathLength: pct }}
            transition={{ duration: reduce ? 0 : 0.9, ease }}
            style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 45%, transparent))` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Horizontal meter. */
export function Meter({ value, tone, className }: { value: number; tone?: VizTone; className?: string }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-(--pp-line)", className)}>
      <motion.div
        className="h-full origin-left rounded-full"
        style={{ backgroundColor: toneVar[tone ?? rateTone(value)], width: `${pct}%` }}
        initial={{ scaleX: reduce ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: reduce ? 0 : 0.7, ease }}
      />
    </div>
  );
}
