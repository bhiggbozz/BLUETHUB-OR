export function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5 no-underline">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-600 to-blue-400 shadow-lg shadow-blue-600/30">
        <svg viewBox="0 0 24 24" className="size-5 stroke-white fill-none stroke-2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <span className="text-xl font-extrabold tracking-tight text-navy-900 dark:text-surface-50">
        Blueth<span className="text-blue-600 dark:text-blue-400">ub</span>
      </span>
    </a>
  );
}
