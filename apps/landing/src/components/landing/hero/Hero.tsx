import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { HERO, PRODUCTS } from "@/data/home";
import { ButtonLink } from "@/components/common/Button";
import { Confirm } from "@/components/common/Confirm";
import { Container } from "@/components/common/Container";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* One soft wash of brand colour; static, decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(60rem_28rem_at_85%_-10%,var(--color-primary-soft),transparent_70%)]"
      />
      <Container className="relative grid gap-12 pt-16 pb-16 md:pt-24 md:pb-24 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pt-28 lg:pb-32">
        <div className="lg:col-span-7">
          <motion.p {...rise(0)} className="eyebrow">
            {HERO.eyebrow}
            <Confirm note={HERO.eyebrowConfirm} />
          </motion.p>
          <motion.h1 {...rise(0.06)} id="hero-title" className="text-display mt-6 max-w-[16ch]">
            {HERO.title}
          </motion.h1>
          <motion.p {...rise(0.12)} className="text-lede mt-6 measure">
            {HERO.lede}
            <Confirm note={HERO.ledeConfirm} />
          </motion.p>
          <motion.div {...rise(0.18)} className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={HERO.primary.href} size="lg" arrow className="max-sm:w-full">
              {HERO.primary.label}
            </ButtonLink>
            <ButtonLink href={HERO.secondary.href} size="lg" variant="secondary" className="max-sm:w-full">
              {HERO.secondary.label}
            </ButtonLink>
          </motion.div>
          <motion.p {...rise(0.24)} className="text-caption mt-10 flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-border-strong" />
            {HERO.trust}
          </motion.p>
        </div>

        {/* An editorial "contents page" of the products: doubles as navigation. */}
        <motion.nav
          {...rise(0.2)}
          aria-label="Our products"
          className="lg:col-span-5 lg:col-start-8"
        >
          <div className="rounded-lg border border-border bg-card p-2 shadow-lift">
            <p className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="eyebrow text-muted">Our products</span>
              <span className="text-caption">04</span>
            </p>
            <ol>
              {PRODUCTS.map((p, i) => (
                <li key={p.id} className="border-t border-border first:border-t-0">
                  <a
                    href={`#product-${p.id}`}
                    className="group flex items-center gap-4 rounded-md px-4 py-4 transition-colors hover:bg-tint"
                  >
                    <span className="w-6 font-serif text-sm text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-xl text-heading">{p.name}</span>
                      <span className="text-caption block">{p.sector}</span>
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                    />
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </motion.nav>
      </Container>
    </section>
  );
}
