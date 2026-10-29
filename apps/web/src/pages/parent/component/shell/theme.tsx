import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { springy } from "../ui/motion";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "bluethub.parent.theme";
const QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readStored = (): ThemePreference => {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
};

const systemPrefersDark = () => typeof window !== "undefined" && window.matchMedia?.(QUERY).matches === true;

/**
 * Parent-portal theme. The resolved theme is written to <html data-pp-theme>
 * (not just the shell) so portalled dialogs, menus and the command palette
 * follow it. The attribute is removed when the portal unmounts, so other
 * roles' pages are never affected.
 */
export function ParentThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: ResolvedTheme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  // Layout effect: apply before paint so there is no flash of the wrong theme.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.ppTheme = resolved;
    return () => {
      delete root.dataset.ppTheme;
    };
  }, [resolved]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* storage unavailable: keep the choice for this session only */
    }
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useParentTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useParentTheme must be used within ParentThemeProvider");
  return ctx;
}

export const THEME_OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Three-way switch for the dark navigation rail. Radio semantics, arrow keys move. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { preference, setPreference } = useParentTheme();
  const id = useId();

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = THEME_OPTIONS.findIndex((o) => o.value === preference);
    const next = THEME_OPTIONS[(i + (e.key === "ArrowRight" ? 1 : -1) + THEME_OPTIONS.length) % THEME_OPTIONS.length];
    setPreference(next.value);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      onKeyDown={onKeyDown}
      className={cn("grid grid-cols-3 gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1", className)}
    >
      {THEME_OPTIONS.map((o) => {
        const active = o.value === preference;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-value={o.value}
            onClick={() => setPreference(o.value)}
            className={cn(
              "relative flex h-8 items-center justify-center gap-1.5 rounded-[9px] text-[12px] font-semibold transition-colors",
              active ? "text-white" : "text-white/45 hover:text-white/80",
            )}
          >
            {active && (
              <motion.span
                layoutId={`theme-${id}`}
                transition={springy}
                className="absolute inset-0 rounded-[9px] border border-white/10 bg-white/[0.1]"
              />
            )}
            <o.icon className="relative size-3.5" />
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
