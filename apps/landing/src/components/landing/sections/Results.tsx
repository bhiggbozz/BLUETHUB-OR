import { Quote } from "lucide-react";
import { Card } from "@bluethub/ui-kit/components/ui/card";
import { BENEFITS, FACTS, RESULTS, RESULT_PLACEHOLDERS, TESTIMONIAL_PLACEHOLDERS } from "@/data/home";
import { CountUp, Reveal, Stagger } from "@/components/common/motion";
import { PlaceholderTag } from "@/components/common/Placeholder";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

export function Results() {
  return (
    <Section id="results" labelledBy="results-title">
      <SectionHeader id="results-title" eyebrow={RESULTS.eyebrow} title={RESULTS.title} lede={RESULTS.lede} />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stagger>
          {BENEFITS.map((b) => (
            <Reveal as="li" key={b.title}>
              <Card className="group h-full gap-0 rounded-lg border-border p-6 shadow-soft transition-shadow duration-200 hover:shadow-lift md:p-7">
                <span className="inline-flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <b.icon aria-hidden className="rotate-on-hover size-5" />
                </span>
                <h3 className="text-h4 mt-5">{b.title}</h3>
                <p className="mt-2 text-[0.9375rem] text-muted-foreground">{b.line}</p>
              </Card>
            </Reveal>
          ))}
        </Stagger>
      </ul>

      {/* True product facts, counted up once on view. */}
      <dl className="mt-16 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 md:mt-20">
        {FACTS.map((f) => (
          <div key={f.label} className="bg-card p-6 md:p-8">
            <dt className="text-[0.9375rem] text-muted-foreground">{f.label}</dt>
            <dd className="mt-3 flex items-baseline gap-3">
              <CountUp to={f.value} className="font-serif text-6xl leading-none text-heading" />
              <span className="text-caption">{f.detail}</span>
            </dd>
          </div>
        ))}
      </dl>

      {/* Outcomes Bluethub will measure during pilots: labelled, never faked. */}
      <div className="mt-12 grid gap-8 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <h3 className="text-h3">Results from our pilots</h3>
          <p className="text-caption mt-2">We'll publish these once our first pilot schools report back.</p>
          <dl className="mt-6 divide-y divide-border border-y border-border">
            {RESULT_PLACEHOLDERS.map((label) => (
              <div key={label} className="flex items-baseline justify-between gap-4 py-4">
                <dt className="text-[0.9375rem] text-muted-foreground">{label}</dt>
                <dd>
                  <PlaceholderTag>Add figure</PlaceholderTag>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
          {TESTIMONIAL_PLACEHOLDERS.map((t, i) => (
            <Reveal key={t.who} delay={i * 80} className="h-full">
              <figure className="flex h-full flex-col rounded-lg border border-dashed border-border-strong bg-card p-6 md:p-8">
                <Quote aria-hidden className="size-6 text-border-strong" />
                <blockquote className="mt-4 flex-1 font-serif text-xl leading-snug text-muted-foreground italic">{t.hint}</blockquote>
                <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="text-caption">{t.who}</span>
                  <PlaceholderTag>Testimonial</PlaceholderTag>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
