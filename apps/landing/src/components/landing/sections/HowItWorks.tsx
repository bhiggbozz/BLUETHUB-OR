import { HOW } from "@/data/home";
import { Confirm } from "@/components/common/Confirm";
import { Cta } from "@/components/common/Cta";
import { Reveal, Stagger } from "@/components/common/motion";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

export function HowItWorks() {
  return (
    <Section id="how" tone="tint" labelledBy="how-title">
      <SectionHeader
        id="how-title"
        eyebrow={HOW.eyebrow}
        title={HOW.title}
        lede={HOW.lede}
        action={
          <Cta href={HOW.action.href} arrow>
            {HOW.action.label}
          </Cta>
        }
      />
      <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <Stagger>
          {HOW.steps.map((s, i) => (
            <Reveal as="li" key={s.title} className="border-t border-heading/80 pt-6">
              <span className="font-serif text-5xl leading-none text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-h3 mt-6">
                {s.title}
                {s.confirm && <Confirm note={s.confirm} />}
              </h3>
              <p className="mt-2 text-muted-foreground">{s.line}</p>
            </Reveal>
          ))}
        </Stagger>
      </ol>
    </Section>
  );
}
