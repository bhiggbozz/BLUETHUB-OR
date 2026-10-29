import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export type Tone = "neutral" | "iris" | "present" | "absent" | "warn";

const toneCls: Record<Tone, string> = {
  neutral: "bg-(--pp-text)/[0.05] text-(--pp-muted)",
  iris: "bg-(--pp-iris-soft) text-(--pp-iris)",
  present: "bg-(--pp-present-soft) text-(--pp-present)",
  absent: "bg-(--pp-absent-soft) text-(--pp-absent)",
  warn: "bg-(--pp-warn-soft) text-(--pp-warn)",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold leading-none",
        toneCls[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "pp-mono inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-current/20 px-1 text-[10px] font-semibold opacity-70",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("pp-skeleton", className)} />;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-5 py-8" : "px-6 py-14", className)}>
      <div className="relative mb-4">
        <div aria-hidden className="absolute inset-0 -z-0 scale-150 rounded-full bg-(--pp-glow)/15 blur-2xl" />
        <div className="relative inline-flex size-12 items-center justify-center rounded-2xl border border-(--pp-line) bg-(--pp-surface) text-(--pp-iris) shadow-(--pp-shadow-sm)">
          {icon}
        </div>
      </div>
      <p className="pp-display text-[15px] font-semibold text-(--pp-text)">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-(--pp-muted)">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-(--pp-absent)/20 bg-(--pp-absent-soft) p-4 sm:flex-row sm:items-center",
        className,
      )}
    >
      <AlertTriangle className="size-5 shrink-0 text-(--pp-absent)" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-(--pp-text)">{title}</p>
        <p className="mt-0.5 text-[13px] text-(--pp-muted)">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RotateCw className="size-3.5" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function InlineNotice({
  tone = "iris",
  icon,
  children,
  action,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-3 text-[13px] leading-5", toneCls[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 text-(--pp-text)">{children}</div>
      {action}
    </div>
  );
}
