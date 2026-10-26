import { ArrowRight, Check } from "lucide-react";
import { BEFORE_AFTER, SOLUTION } from "@/data/home";
import { Cta } from "@/components/common/Cta";
import { Reveal, Stagger } from "@/components/common/motion";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

export function Solution() {
  return (
    <Section id="solution" tone="tint" labelledBy="solution-title">
      <SectionHeader
        id="solution-title"
        eyebrow={SOLUTION.eyebrow}
        title={SOLUTION.title}
        lede={SOLUTION.lede}
        action={
          <Cta href={SOLUTION.action.href} arrow>
            {SOLUTION.action.label}
          </Cta>
        }
      />
      <ol className="divide-y divide-border rounded-lg border border-border bg-card shadow-soft">
        <Stagger>
          {BEFORE_AFTER.map((row) => (
            <Reveal
              as="li"
              key={row.before}
              className="grid items-center gap-2 px-5 py-5 sm:grid-cols-[1fr_auto_1.6fr] sm:gap-6 md:px-8"
            >
              <span className="text-[0.9375rem] text-muted-foreground line-through decoration-border-strong decoration-1">
                {row.before}
              </span>
              <ArrowRight aria-hidden className="size-4 text-primary max-sm:hidden" />
              <span className="flex items-start gap-3 font-medium text-heading">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                </span>
                <span>
                  <span className="sr-only">Now: </span>
                  {row.after}
                </span>
              </span>
            </Reveal>
          ))}
        </Stagger>
      </ol>
    </Section>
  );
}
