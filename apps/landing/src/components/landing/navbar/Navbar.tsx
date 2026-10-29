import { useCallback, useId, useState } from "react";
import { PRIMARY_CTA } from "@/data/site";
import { Cta } from "@/components/common/Cta";
import { Container } from "@/components/common/Container";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";

/** Three bars that morph into an X. Transform-only, 300ms, shared easing. */
function MenuIcon({ open }: { open: boolean }) {
  const bar = "absolute left-0 h-[2px] w-5 rounded-full bg-current transition-[transform,opacity] duration-300 ease-[var(--ease-out-soft)]";
  return (
    <span aria-hidden className="relative block h-3.5 w-5">
      <span className={cn(bar, "top-0", open && "translate-y-[6px] rotate-45")} />
      <span className={cn(bar, "top-[6px]", open && "scale-x-0 opacity-0")} />
      <span className={cn(bar, "top-[12px]", open && "-translate-y-[6px] -rotate-45")} />
    </span>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-[60] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>
      <Container className="flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <Logo />
        <NavLinks />
        <div className="flex items-center gap-2">
          <ThemeToggle className="max-lg:hidden" />
          <Cta href={PRIMARY_CTA.href} className="max-sm:hidden">
            {PRIMARY_CTA.label}
          </Cta>
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls={menuId}
            className="inline-flex size-11 items-center justify-center rounded-md text-heading hover:bg-accent lg:hidden"
          >
            <MenuIcon open={isOpen} />
          </button>
        </div>
      </Container>
      <MobileMenu id={menuId} isOpen={isOpen} onClose={close} />
    </header>
  );
}
