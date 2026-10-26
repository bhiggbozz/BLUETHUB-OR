import { ArrowUpRight, Check } from "lucide-react";
import { PRODUCTS, PRODUCTS_INTRO, type Product } from "@/data/home";
import { ButtonLink } from "@/components/common/Button";
import { Confirm } from "@/components/common/Confirm";
import { MediaPlaceholder } from "@/components/common/Placeholder";
import { Reveal } from "@/components/common/Reveal";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { cn } from "@/lib/utils";

export function Products() {
  return (
    <Section id="products" labelledBy="products-title">
      <SectionHeader
        id="products-title"
        eyebrow={PRODUCTS_INTRO.eyebrow}
        title={PRODUCTS_INTRO.title}
        lede={PRODUCTS_INTRO.lede}
        action={
          <ButtonLink href={PRODUCTS_INTRO.action.href} variant="secondary" arrow>
            {PRODUCTS_INTRO.action.label}
          </ButtonLink>
        }
      />
      <div className="space-y-6 md:space-y-8">
        {PRODUCTS.map((p, i) => (
          <ProductRow key={p.id} product={p} index={i} />
        ))}
      </div>
    </Section>
  );
}

function ProductRow({ product: p, index }: { product: Product; index: number }) {
  const flip = index % 2 === 1;
  return (
    <Reveal as="article">
      <div
        id={`product-${p.id}`}
        className="grid scroll-mt-24 gap-8 rounded-lg border border-border bg-card p-6 shadow-soft md:p-8 lg:grid-cols-12 lg:items-center lg:gap-12 lg:p-10"
      >
        <div className={cn("lg:col-span-5", flip && "lg:order-2 lg:col-start-8")}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-caption font-medium">
              {String(index + 1).padStart(2, "0")} · {p.sector}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                p.status === "Live" ? "bg-primary-soft text-primary" : "bg-tint text-muted",
              )}
            >
              <span aria-hidden className={cn("size-1.5 rounded-full", p.status === "Live" ? "bg-primary" : "bg-muted")} />
              {p.status}
            </span>
            <Confirm note={p.confirm} />
          </div>
          <h3 id={`product-${p.id}-name`} className="text-h2 mt-4">
            {p.name}
          </h3>
          <p className="text-lede mt-3">{p.line}</p>
          <ul className="mt-6 space-y-2.5">
            {p.points.map((pt) => (
              <li key={pt} className="flex gap-3 text-[0.9375rem]">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
                {pt}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {p.url && (
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
              >
                Visit {p.name}
                <ArrowUpRight aria-hidden className="size-4" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            <a
              href="#contact"
              className="inline-flex items-center gap-1.5 font-semibold text-heading underline decoration-border-strong underline-offset-4 hover:decoration-heading"
            >
              Ask about {p.name}
            </a>
          </div>
        </div>

        <div className={cn("lg:col-span-6", flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-7")}>
          <MediaPlaceholder label={`${p.name} screenshot`} ratio="aspect-[16/10]">
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center px-6 text-center font-serif text-[clamp(2rem,4.5vw,4rem)] leading-none whitespace-nowrap text-border-strong select-none"
            >
              {p.name}
            </span>
          </MediaPlaceholder>
        </div>
      </div>
    </Reveal>
  );
}
