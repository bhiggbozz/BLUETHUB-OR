import { FOOTER_LINKS } from "@/data/navigation";
import { Container } from "@/components/common/Container";

export function Footer() {
  return (
    <footer className="bg-navy-900 px-5 pt-12 sm:pt-[70px] pb-8 text-white/50 lg:px-[5vw]">
      <Container className="mx-auto">
        {/* Top grid */}
        <div className="mb-10 grid grid-cols-1 gap-10 sm:mb-14 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[2.2fr_1fr_1fr_1fr] lg:gap-15">
          {/* Brand column */}
          <div>
            <div className="mb-4">
              <a href="/" className="flex items-center gap-2.5 no-underline">
                <div className="flex size-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-blue-600 to-blue-400">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-[18px] stroke-white fill-none stroke-2"
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <span className="text-lg font-extrabold text-white">
                  Blueth<span className="text-blue-400">ub</span>
                </span>
              </a>
            </div>
            <p className="max-w-[260px] text-[13px] leading-[1.75]">
              Connecting schools, teachers, students and parents through powerful,
              offline-first education technology built for Africa.
            </p>
          </div>

          {/* Link columns */}
          {(["platform", "company", "support"] as const).map((section) => (
            <div key={section}>
              <h4 className="mb-[18px] text-[11px] font-bold uppercase tracking-wider text-white/80">
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </h4>
              <ul className="space-y-[11px]">
                {FOOTER_LINKS[section].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-white/40 no-underline transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center gap-3 border-t border-white/[0.08] pt-6 sm:flex-row sm:justify-between">
          <span className="text-xs">© 2026 Bluethub. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#" className="text-xs text-white/30 no-underline transition-colors hover:text-white/80">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-white/30 no-underline transition-colors hover:text-white/80">
              Terms of Service
            </a>
            <a href="#" className="text-xs text-white/30 no-underline transition-colors hover:text-white/80">
              Cookies
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
