import { cn } from "@/lib/utils";

/**
 * A visibly labelled placeholder for content Bluethub still needs to supply
 * (figures, testimonials, screenshots). Shown in every build on purpose,
 * so nobody mistakes it for a real claim.
 */
export function PlaceholderTag({ children = "Placeholder", className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-highlight" />
      {children}
    </span>
  );
}
