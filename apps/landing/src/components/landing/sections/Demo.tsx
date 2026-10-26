import { Check } from "lucide-react";
import { DEMO } from "@/data/home";
import { SITE } from "@/data/site";
import { Confirm } from "@/components/common/Confirm";
import { Reveal } from "@/components/common/motion";
import { Section } from "@/components/common/Section";
import { DemoForm } from "./DemoForm";

/** Final CTA band + demo-request form on the dark ink surface. */
export function Demo() {
  return (
    <Section id="demo" tone="ink" labelledBy="demo-title" className="overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"
      />
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow text-blue-200">{DEMO.eyebrow}</p>
          <h2 id="demo-title" className="text-h1 mt-4 text-ink-foreground">
            {DEMO.title}
          </h2>
          <p className="text-lede mt-6 text-ink-muted">{DEMO.lede}</p>
          <ul className="mt-10 space-y-4 border-t border-white/10 pt-8">
            {DEMO.points.map((p, i) => (
              <li key={p} className="flex gap-3 text-white">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-blue-200">
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                </span>
                <span>
                  {p}
                  {i === 0 && <Confirm note={DEMO.pointsConfirm} />}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[0.9375rem] text-ink-muted">
            Prefer email?{" "}
            <a href={`mailto:${SITE.email}`} className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
              {SITE.email}
            </a>
            <Confirm note="Public contact email" />
          </p>
        </Reveal>
        <Reveal delay={100} className="lg:col-span-7 lg:col-start-6 xl:col-span-6 xl:col-start-7">
          <DemoForm />
        </Reveal>
      </div>
    </Section>
  );
}
