interface BoardSectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

/** Small uppercase, letter-spaced section heading — shared chrome convention
 * for the board properties panel and any other grouped control cluster in
 * the live-class UI (e.g. the raised-hands popover). */
export default function BoardSectionLabel({ children, className }: BoardSectionLabelProps) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${className ?? ""}`}>
      {children}
    </p>
  );
}
