import { FOOTER_GROUPS, LEGAL_LINKS, SITE, SOCIAL_LINKS } from "@/data/site";
import { Container } from "@/components/common/Container";
import { Confirm } from "@/components/common/Confirm";
import { Logo } from "@/components/landing/navbar/Logo";

const linkCls = "text-[0.9375rem] text-ink-muted transition-colors hover:text-white";

export function Footer() {
  const year = new Date().getFullYear();
  const socials = SOCIAL_LINKS.filter((s) => s.href);

  return (
    <footer className="bg-ink pt-16 pb-10 text-ink-muted md:pt-24">
      <Container>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-12">
          <div className="col-span-2 lg:col-span-5">
            <Logo onInk />
            <p className="mt-6 max-w-sm font-serif text-2xl leading-snug text-white">{SITE.tagline}</p>
            <p className="mt-4 text-[0.9375rem]">
              <a href={`mailto:${SITE.email}`} className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                {SITE.email}
              </a>
              <Confirm note="Public contact email" />
              <span className="mt-1 block">
                {SITE.location}
                <Confirm note="Office location" />
              </span>
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="lg:col-span-2">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-white uppercase">{group.title}</h2>
              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className={linkCls}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 lg:col-span-3">
            <h2 className="text-xs font-semibold tracking-[0.14em] text-white uppercase">Follow</h2>
            {socials.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noreferrer noopener" className={linkCls}>
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-[0.9375rem]">
                Social profiles coming soon.
                <Confirm note="Add LinkedIn / X / Instagram URLs in data/site.ts" />
              </p>
            )}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <li key={l.label}>
                {l.href ? (
                  <a href={l.href} className={linkCls}>
                    {l.label}
                  </a>
                ) : (
                  <span>
                    {l.label} <span className="text-white/50">(coming soon)</span>
                    <Confirm note="Legal page URL needed" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
