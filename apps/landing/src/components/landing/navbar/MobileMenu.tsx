import { useEffect, useRef } from "react";
import { NAV_LINKS, PRIMARY_CTA } from "@/data/site";
import { Cta } from "@/components/common/Cta";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface MobileMenuProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Slide-down menu for small screens (CSS transitions only).
 * Escape closes it, focus moves in on open, the page behind stops scrolling,
 * and it is `inert` while closed so hidden links can't be tabbed to.
 */
export function MobileMenu({ id, isOpen, onClose }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const mq = window.matchMedia("(min-width: 64rem)");
    const onWide = () => mq.matches && onClose();
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 top-16 z-40 bg-navy-900/30 transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={panelRef}
        id={id}
        inert={!isOpen}
        className={cn(
          "absolute inset-x-0 top-full z-50 border-b border-border bg-background shadow-lift lg:hidden",
          "transition-[opacity,transform] duration-300 ease-[var(--ease-out-soft)]",
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <nav aria-label="Mobile" className="px-4 pt-2 pb-6 sm:px-6">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href} className="border-b border-border">
                <a href={link.href} onClick={onClose} className="flex min-h-12 items-center text-base font-medium text-heading">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="text-caption">Theme</span>
            <ThemeToggle />
          </div>
          <Cta href={PRIMARY_CTA.href} onClick={onClose} size="lg" arrow className="mt-4 w-full">
            {PRIMARY_CTA.label}
          </Cta>
        </nav>
      </div>
    </>
  );
}
