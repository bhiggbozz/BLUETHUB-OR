import { cn } from "@/lib/utils";

/**
 * A visibly labelled placeholder for content Bluethub still needs to supply
 * (client quotes, figures, photos, screenshots). Shown in every build on purpose,
 * so nobody mistakes it for a real claim.
 */
export function PlaceholderTag({ children = "Placeholder", className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-muted uppercase",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-accent" />
      {children}
    </span>
  );
}

interface MediaPlaceholderProps {
  label: string;
  /** e.g. "aspect-[16/10]" */
  ratio?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Fixed-ratio frame for a missing image, so the layout never shifts when the real asset lands. */
export function MediaPlaceholder({ label, ratio = "aspect-[16/10]", className, children }: MediaPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`${label} (placeholder)`}
      className={cn(
        "relative overflow-hidden rounded-md border border-border bg-tint",
        "bg-[radial-gradient(var(--color-border-strong)_1px,transparent_1px)] [background-size:16px_16px]",
        ratio,
        className,
      )}
    >
      {children}
      <span className="absolute bottom-3 left-3">
        <PlaceholderTag>{label}</PlaceholderTag>
      </span>
    </div>
  );
}
