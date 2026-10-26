import { Check } from "lucide-react";
import { PILOT } from "@/data/home";
import { Confirm } from "@/components/common/Confirm";
import { Cta } from "@/components/common/Cta";
import { Reveal } from "@/components/common/motion";
import { Section } from "@/components/common/Section";

export function Pilot() {
  return (
    <Section id="pilot" labelledBy="pilot-title">
      <Reveal className="grid overflow-hidden rounded-xl border border-border bg-card shadow-lift lg:grid-cols-12">
        <div className="p-6 sm:p-10 lg:col-span-7 lg:p-14">
          <p className="eyebrow">{PILOT.eyebrow}</p>
          <h2 id="pilot-title" className="text-h1 mt-4">
            {PILOT.title}
          </h2>
          <p className="text-lede mt-5 measure">
            {PILOT.lede}
            <Confirm note={PILOT.ledeConfirm} />
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Cta href={PILOT.primary.href} size="lg" arrow className="max-sm:w-full">
              {PILOT.primary.label}
            </Cta>
            <Cta href={PILOT.secondary.href} size="lg" tone="secondary" className="max-sm:w-full">
              {PILOT.secondary.label}
            </Cta>
          </div>
        </div>

        <div className="border-t border-border bg-tint p-6 sm:p-10 lg:col-span-5 lg:border-t-0 lg:border-l lg:p-14">
          <p className="flex items-baseline gap-3">
            <span className="font-serif text-7xl leading-none text-primary">3</span>
            <span className="text-h4">months, with real classes</span>
          </p>
          <h3 className="mt-8 text-caption font-semibold tracking-[0.14em] uppercase">
            What's included
            <Confirm note={PILOT.includedConfirm} />
          </h3>
          <ul className="mt-4 space-y-3">
            {PILOT.included.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </Section>
  );
}
