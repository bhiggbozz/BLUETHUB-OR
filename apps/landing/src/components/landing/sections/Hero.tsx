import { HERO } from "@/data/home";
import { CircularBadge } from "@/components/common/CircularBadge";
import { Confirm } from "@/components/common/Confirm";
import { Container } from "@/components/common/Container";
import { Cta } from "@/components/common/Cta";
import { Reveal, Rotate } from "@/components/common/motion";
import { AdminDashboardMock } from "../mockups/AdminDashboardMock";
import { AttendanceScanMock } from "../mockups/AttendanceScanMock";

/** Slow ambient orbit behind the product shots: one full turn every 26s, paused off-screen. */
function Orbit() {
  return (
    <Rotate mode="ambient" className="absolute top-1/2 left-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 max-md:size-[24rem]">
      <svg viewBox="0 0 400 400" className="size-full" fill="none">
        <circle cx="200" cy="200" r="196" className="stroke-border-strong" strokeWidth="1" strokeDasharray="2 8" />
        <circle cx="200" cy="200" r="150" className="stroke-border" strokeWidth="1" />
        <circle cx="200" cy="4" r="5" className="fill-primary" />
        <circle cx="350" cy="200" r="4" className="fill-highlight" />
        <circle cx="61" cy="306" r="3" className="fill-primary/50" />
      </svg>
    </Rotate>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(60rem_28rem_at_80%_-10%,var(--color-primary-soft),transparent_70%)]"
      />
      <Container className="relative grid gap-14 pt-14 pb-16 md:pt-20 md:pb-24 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pt-24 lg:pb-28">
        <div className="lg:col-span-6">
          <Reveal as="p" className="eyebrow">
            {HERO.eyebrow}
            <Confirm note={HERO.eyebrowConfirm} />
          </Reveal>
          {/* The h1 is the LCP element: it renders immediately, no entrance animation. */}
          <h1 id="hero-title" className="text-display mt-6 max-w-[15ch]">
            {HERO.title}
          </h1>
          <Reveal as="p" delay={80} className="text-lede mt-6 measure">
            {HERO.lede}
          </Reveal>

          <Reveal delay={160} className="mt-10 flex flex-wrap items-center gap-3">
            <Cta href={HERO.primary.href} size="lg" arrow className="max-sm:w-full">
              {HERO.primary.label}
            </Cta>
            <Cta href={HERO.secondary.href} size="lg" tone="secondary" className="max-sm:w-full">
              {HERO.secondary.label}
            </Cta>
            <CircularBadge text={HERO.badge} href="#pilot" label="About the 3-month pilot" className="ml-3 max-lg:hidden" />
          </Reveal>

          <Reveal as="p" delay={240} className="text-caption mt-10 flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-border-strong" />
            {HERO.trust}
          </Reveal>
        </div>

        <div className="relative lg:col-span-6">
          <Orbit />
          <Reveal delay={120} className="relative">
            <AdminDashboardMock className="lg:mr-24" />
          </Reveal>
          <Reveal delay={320} className="absolute -right-2 -bottom-14 max-sm:hidden lg:-right-4">
            <AttendanceScanMock className="w-[172px] rotate-[4deg]" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
