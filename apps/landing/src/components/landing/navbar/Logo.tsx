import { cn } from "@/lib/utils";

interface LogoProps {
  /** Use on the dark footer / ink surfaces. */
  onInk?: boolean;
  className?: string;
}

/** The Bluethub mark and wordmark (unchanged design). */
export function Logo({ onInk, className }: LogoProps) {
  return (
    <a href="/" aria-label="Bluethub home" className={cn("flex items-center gap-2.5 rounded-md no-underline", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-600 to-blue-400 shadow-sm shadow-blue-600/25">
        <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-white stroke-2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </span>
      <span className={cn("text-xl font-extrabold tracking-tight", onInk ? "text-white" : "text-heading")}>
        Blueth<span className={onInk ? "text-blue-400" : "text-primary"}>ub</span>
      </span>
    </a>
  );
}
