import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import bluethubLogo from "@/assets/logo/B_Transparent.png";
import { ThemeSwitcher } from "@/component/shared/app-theme";

/**
 * Thin, persistent shell bar above the sidebar/content row — separate from
 * each admin page's own in-content header (title, page actions, the
 * existing mobile "open sidebar" hamburger via the `openMobileNav` Outlet
 * context). This bar only owns: the brand mark, a mobile-only back button,
 * and the theme switcher — nothing that would require touching the ~30
 * existing pages' own headers in this pass.
 */
export default function AdminTopBar() {
  const navigate = useNavigate();

  const handleBack = () => {
    const canGoBack = typeof window !== "undefined" && (window.history.state?.idx ?? 0) > 0;
    if (canGoBack) navigate(-1);
    else navigate("/admin");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 sm:px-4">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="md:hidden flex size-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </button>
        <img
          src={bluethubLogo}
          alt="Bluethub"
          className="h-7 w-auto shrink-0 rounded-sm dark:bg-white dark:p-0.5"
        />
      </div>

      <ThemeSwitcher />
    </header>
  );
}
