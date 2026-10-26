import { PROCESS_INTRO, STEPS } from "@/data/home";
import { ButtonLink } from "@/components/common/Button";
import { Confirm } from "@/components/common/Confirm";
import { Reveal } from "@/components/common/Reveal";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

export function HowItWorks() {
  return (
    <Section id="process" tone="tint" labelledBy="process-title">
      <SectionHeader
        id="process-title"
        eyebrow={PROCESS_INTRO.eyebrow}
        title={PROCESS_INTRO.title}
        lede={PROCESS_INTRO.lede}
        action={
          <ButtonLink href={PROCESS_INTRO.action.href} arrow>
            {PROCESS_INTRO.action.label}
          </ButtonLink>
        }
      />

      <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {STEPS.map((step, i) => (
          <Reveal as="li" key={step.title} delay={i * 0.06} className="relative border-t border-heading/80 pt-6">
            <span className="font-serif text-5xl leading-none text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="text-h3 mt-6">{step.title}</h3>
            <p className="mt-2 text-muted">{step.line}</p>
            <p className="text-caption mt-4 font-medium">
              {step.duration}
              {i === 0 && <Confirm note={PROCESS_INTRO.confirm} />}
            </p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
