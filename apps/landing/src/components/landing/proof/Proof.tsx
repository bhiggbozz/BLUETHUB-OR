import { Quote } from "lucide-react";
import { EXPERIENCE, FIGURE_PLACEHOLDERS, PROOF_INTRO, QUOTE_PLACEHOLDERS } from "@/data/home";
import { PlaceholderTag } from "@/components/common/Placeholder";
import { Reveal } from "@/components/common/Reveal";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

export function Proof() {
  return (
    <Section id="proof" labelledBy="proof-title">
      <SectionHeader id="proof-title" eyebrow={PROOF_INTRO.eyebrow} title={PROOF_INTRO.title} lede={PROOF_INTRO.lede} />

      {/* Real, verifiable experience */}
      <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {EXPERIENCE.map((e, i) => (
          <Reveal as="li" key={e.title} delay={i * 0.06}>
            <e.icon aria-hidden className="size-6 text-primary" />
            <h3 className="text-h4 mt-4">{e.title}</h3>
            <p className="mt-2 text-[0.9375rem] text-muted">{e.line}</p>
          </Reveal>
        ))}
      </ul>

      <hr className="my-16 border-border md:my-20" />

      {/* Figures and quotes Bluethub still needs to supply: labelled, never faked. */}
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-4">
          <h3 className="text-h3">In numbers</h3>
          <dl className="mt-6 divide-y divide-border border-y border-border">
            {FIGURE_PLACEHOLDERS.map((label) => (
              <div key={label} className="flex items-baseline justify-between gap-4 py-4">
                <dt className="text-[0.9375rem] text-muted">{label}</dt>
                <dd className="flex items-center gap-3">
                  <span aria-hidden className="font-serif text-3xl text-border-strong">—</span>
                  <PlaceholderTag>Add figure</PlaceholderTag>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
          {QUOTE_PLACEHOLDERS.map((q, i) => (
            <Reveal key={i} delay={i * 0.06} className="h-full">
              <figure className="flex h-full flex-col rounded-lg border border-dashed border-border-strong bg-card p-6 md:p-8">
                <Quote aria-hidden className="size-6 text-border-strong" />
                <blockquote className="mt-4 flex-1 font-serif text-xl leading-snug text-muted italic">{q.hint}</blockquote>
                <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="text-caption">{q.who}</span>
                  <PlaceholderTag>Client quote</PlaceholderTag>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal className="mt-12">
        <p className="text-caption mb-4">Clients and partners</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="flex h-16 items-center justify-center rounded-md border border-dashed border-border-strong text-caption"
            >
              <PlaceholderTag>Logo</PlaceholderTag>
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}
