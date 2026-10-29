import { cn } from "@/lib/utils";

interface LogoProps {
  /** Use on the dark footer / ink surfaces. */
  onInk?: boolean;
  className?: string;
}

/** Bluethub mark (the app's own icon) and wordmark. */
export function Logo({ onInk, className }: LogoProps) {
  return (
    <a href="/" aria-label="Bluethub home" className={cn("flex items-center gap-2.5 rounded-md no-underline", className)}>
      <img src="/logo-192.png" alt="" width={36} height={36} className="size-9 shrink-0" decoding="async" />
      <span className={cn("text-xl font-extrabold tracking-tight", onInk ? "text-white" : "text-heading")}>
        Blueth<span className={onInk ? "text-blue-400" : "text-primary"}>ub</span>
      </span>
    </a>
  );
}
