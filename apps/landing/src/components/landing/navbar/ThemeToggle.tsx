import { Moon, Sun } from "lucide-react";
import { Button } from "@bluethub/ui-kit/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      className={cn("relative text-muted-foreground hover:text-heading", className)}
    >
      <Sun
        aria-hidden
        className={cn(
          "absolute size-[18px] transition-[transform,opacity] duration-300 ease-[var(--ease-out-soft)]",
          isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0",
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          "absolute size-[18px] transition-[transform,opacity] duration-300 ease-[var(--ease-out-soft)]",
          isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
    </Button>
  );
}
