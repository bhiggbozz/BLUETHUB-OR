import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NAV_LINKS, PRIMARY_CTA } from "@/data/site";
import { ButtonLink } from "@/components/common/Button";
import { ThemeToggle } from "./ThemeToggle";

interface MobileMenuProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
}

/** Slide-down menu for small screens. Escape closes it; focus moves in on open. */
export function MobileMenu({ id, isOpen, onClose }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const mq = window.matchMedia("(min-width: 64rem)");
    const onResize = () => mq.matches && onClose();
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onResize);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            aria-hidden
            onClick={onClose}
            className="fixed inset-0 top-16 z-40 bg-navy-900/30 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={panelRef}
            id={id}
            className="absolute inset-x-0 top-full z-50 border-b border-border bg-background shadow-lift lg:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav aria-label="Mobile" className="px-4 pt-2 pb-6 sm:px-6">
              <ul>
                {NAV_LINKS.map((link) => (
                  <li key={link.href} className="border-b border-border">
                    <a
                      href={link.href}
                      onClick={onClose}
                      className="flex min-h-12 items-center text-base font-medium text-heading"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="text-caption">Theme</span>
                <ThemeToggle />
              </div>
              <ButtonLink href={PRIMARY_CTA.href} onClick={onClose} size="lg" arrow className="mt-4 w-full">
                {PRIMARY_CTA.label}
              </ButtonLink>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
