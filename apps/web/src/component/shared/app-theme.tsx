import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Button } from "@bluethub/ui-kit";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "bluethub.theme";
const QUERY = "(prefers-color-scheme: dark)";

interface AppThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

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
 * Shared Light/Dark/System theme — targets the real `data-theme` attribute
 * that `index.css`'s `@custom-variant dark` and `[data-theme=dark]`
 * overrides key off (the parent portal's `ParentThemeProvider` sets a
 * different, portal-only `data-pp-theme` attribute and doesn't drive these
 * shared tokens — not reused here on purpose).
 *
 * Mount once around whichever top-level route needs it (currently
 * `AdminLayout` and `CalendarLayout` — both sit outside every role's own
 * layout, so each owns its own mount/unmount rather than this being global).
 * The attribute is set in a `useLayoutEffect` (before paint, so no flash)
 * and removed on unmount, so it can never leak into a page that isn't
 * wrapped in a provider.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
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

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    return () => {
      delete root.dataset.theme;
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
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Dropdown theme switcher — drop into any top bar that's inside an
 * `AppThemeProvider`. */
export function ThemeSwitcher() {
  const { preference, setPreference } = useAppTheme();
  const current = THEME_OPTIONS.find((o) => o.value === preference) ?? THEME_OPTIONS[2];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Change theme"
          title={`Theme: ${current.label}`}
          className="size-9 shrink-0"
        >
          <current.icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {THEME_OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => setPreference(o.value)}
            className={o.value === preference ? "bg-accent text-accent-foreground" : undefined}
          >
            <o.icon className="mr-2 size-4" />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
