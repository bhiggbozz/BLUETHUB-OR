interface ConfirmProps {
  /** What needs confirming, shown as a tooltip in development. */
  note: string;
}

/**
 * Marks copy that is an assumption awaiting sign-off.
 * Visible only in development builds, so drafts never reach production.
 */
export function Confirm({ note }: ConfirmProps) {
  if (!import.meta.env.DEV) return null;
  return (
    <span
      title={note}
      className="ml-1.5 inline-flex translate-y-[-0.1em] items-center rounded-sm border border-dashed border-highlight/70 bg-highlight-soft px-1.5 align-middle font-sans text-[0.625rem] font-bold tracking-wide text-highlight-text not-italic"
    >
      CONFIRM
    </span>
  );
}
