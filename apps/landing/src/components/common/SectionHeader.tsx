import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

interface SectionHeaderProps {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** Optional next step shown under the lede (or beside it on wide screens). */
  action?: React.ReactNode;
  align?: "start" | "center";
  onInk?: boolean;
  className?: string;
}

/**
 * Eyebrow + serif headline + one-to-two sentence lede + next step.
 * On wide screens the lede and action sit in the right half of a 12-column grid.
 */
export function SectionHeader({ id, eyebrow, title, lede, action, align = "start", onInk, className }: SectionHeaderProps) {
  if (align === "center") {
    return (
      <Reveal className={cn("mx-auto mb-12 max-w-3xl text-center md:mb-16", className)}>
        <p className={cn("eyebrow", onInk && "text-blue-200")}>{eyebrow}</p>
        <h2 id={id} className={cn("text-h2 mt-4", onInk && "text-ink-foreground")}>
          {title}
        </h2>
        {lede && <p className={cn("text-lede mx-auto mt-4 measure", onInk && "text-ink-muted")}>{lede}</p>}
        {action && <div className="mt-8 flex flex-wrap justify-center gap-3">{action}</div>}
      </Reveal>
    );
  }

  return (
    <Reveal className={cn("mb-12 grid gap-6 md:mb-16 lg:grid-cols-12 lg:items-end lg:gap-8", className)}>
      <div className="lg:col-span-6">
        <p className={cn("eyebrow", onInk && "text-blue-200")}>{eyebrow}</p>
        <h2 id={id} className={cn("text-h2 mt-4", onInk && "text-ink-foreground")}>
          {title}
        </h2>
      </div>
      {(lede || action) && (
        <div className="lg:col-span-5 lg:col-start-8">
          {lede && <p className={cn("text-lede", onInk && "text-ink-muted")}>{lede}</p>}
          {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
        </div>
      )}
    </Reveal>
  );
}
