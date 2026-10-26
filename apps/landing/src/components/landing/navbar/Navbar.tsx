import { useCallback, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { PRIMARY_CTA } from "@/data/site";
import { ButtonLink } from "@/components/common/Button";
import { Container } from "@/components/common/Container";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";

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
          <ButtonLink href={PRIMARY_CTA.href} className="max-sm:hidden">
            {PRIMARY_CTA.label}
          </ButtonLink>
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls={menuId}
            className="inline-flex size-10 items-center justify-center rounded-md text-heading hover:bg-tint lg:hidden"
          >
            {isOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </Container>
      <MobileMenu id={menuId} isOpen={isOpen} onClose={close} />
    </header>
  );
}
