import { Plus } from "lucide-react";
import { FAQ } from "@/data/home";
import { Confirm } from "@/components/common/Confirm";
import { Cta } from "@/components/common/Cta";
import { Reveal } from "@/components/common/motion";
import { Section } from "@/components/common/Section";

/**
 * Objection-handling FAQ. Native <details> gives keyboard and screen-reader
 * support with zero JavaScript; the plus icon rotates 45° when open.
 */
export function Faq() {
  return (
    <Section id="faq" tone="tint" labelledBy="faq-title">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title" className="text-h2 mt-4">
            Questions school leaders ask us.
          </h2>
          <p className="text-lede mt-4">Something we haven't answered? Ask us on your demo.</p>
          <div className="mt-8">
            <Cta href="#demo" arrow>
              Book a demo
            </Cta>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-7 lg:col-start-6">
          <ul className="divide-y divide-border border-y border-border">
            {FAQ.map((item) => (
              <li key={item.q}>
                <details className="group/faq">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left [&::-webkit-details-marker]:hidden">
                    <span className="text-h4">
                      {item.q}
                      {item.confirm && <Confirm note={item.confirm} />}
                    </span>
                    <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-heading transition-transform duration-200 ease-[var(--ease-out-soft)] group-open/faq:rotate-45 group-open/faq:border-primary group-open/faq:bg-primary group-open/faq:text-primary-foreground">
                      <Plus aria-hidden className="size-4" />
                    </span>
                  </summary>
                  <p className="measure pb-6 text-muted-foreground">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
