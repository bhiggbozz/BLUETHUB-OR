/**
 * Motion primitives. All timing lives in CSS tokens (styles/globals.css):
 *   --ease-out-soft  cubic-bezier(0.22, 1, 0.36, 1)
 *   --motion-enter   700ms entrances      --motion-hover   200ms hovers
 *   --motion-stagger 80ms between items   --motion-ambient 26s per turn
 * Only transform and opacity animate. prefers-reduced-motion turns all of it off in CSS.
 * No animation library: an IntersectionObserver plus CSS transitions.
 */
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Tracks whether an element is in the viewport.
 * `once`: stop observing after the first entry (reveals). Otherwise it keeps
 * reporting, which is how looping animations pause when off-screen.
 */
export function useInView<T extends Element>(options: { once?: boolean; rootMargin?: string } = {}) {
  const { once = true, rootMargin = "0px 0px -10% 0px" } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, rootMargin]);

  return { ref, inView };
}

type RevealTag = "div" | "li" | "section" | "article" | "p" | "figure";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Extra delay in ms on top of any stagger index. */
  delay?: number;
  as?: RevealTag;
  style?: CSSProperties;
  id?: string;
}

/** Fades and rises 16px the first time it scrolls into view. Plays once. */
export function Reveal({ children, className, delay = 0, as = "div", style, id }: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>();
  const Tag = as as "div";
  return (
    <Tag
      id={id}
      ref={ref as React.RefObject<HTMLDivElement>}
      data-reveal=""
      className={cn(inView && "is-in", className)}
      style={{ ...style, ...(delay ? ({ "--delay": `${delay}ms` } as CSSProperties) : null) }}
    >
      {children}
    </Tag>
  );
}

/**
 * Staggers its direct children's reveals by --motion-stagger.
 * Children should be <Reveal> elements; each receives its index as --i.
 */
export function Stagger({ children }: { children: ReactNode }) {
  let i = 0;
  return (
    <>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const el = child as ReactElement<{ style?: CSSProperties }>;
        const style = { ...(el.props.style ?? {}), "--i": i++ } as CSSProperties;
        return cloneElement(el, { style });
      })}
    </>
  );
}

interface RotateProps {
  /** ambient: slow full turn (hero) · badge: circular text · scroll: tied to scroll position */
  mode: "ambient" | "badge" | "scroll";
  children: ReactNode;
  className?: string;
}

/** Rotating wrapper. Looping modes pause automatically while off-screen. */
export function Rotate({ mode, children, className }: RotateProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ once: false, rootMargin: "0px" });
  const looping = mode !== "scroll";
  return (
    <div
      ref={ref}
      aria-hidden
      data-paused={looping ? String(!inView) : undefined}
      className={cn(mode === "ambient" && "rotate-ambient", mode === "badge" && "rotate-badge", mode === "scroll" && "rotate-scroll", className)}
    >
      {children}
    </div>
  );
}

interface CountUpProps {
  to: number;
  /** ms */
  duration?: number;
  className?: string;
}

/**
 * Counts from 0 to `to` once, when first visible. Width is reserved with
 * tabular numerals so nothing shifts. Reduced motion shows the final value.
 */
export function CountUp({ to, duration = 1200, className }: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>({ rootMargin: "0px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)} style={{ minWidth: `${String(to).length}ch`, display: "inline-block" }}>
      <span aria-hidden>{value}</span>
      <span className="sr-only">{to}</span>
    </span>
  );
}
