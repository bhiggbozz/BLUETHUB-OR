import { SERVICES, SERVICES_INTRO } from "@/data/home";
import { ButtonLink } from "@/components/common/Button";
import { Confirm } from "@/components/common/Confirm";
import { Reveal } from "@/components/common/Reveal";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

export function Services() {
  return (
    <Section id="services" tone="tint" labelledBy="services-title">
      <SectionHeader
        id="services-title"
        eyebrow={SERVICES_INTRO.eyebrow}
        title={
          <>
            {SERVICES_INTRO.title}
            <Confirm note={SERVICES_INTRO.confirm} />
          </>
        }
        lede={SERVICES_INTRO.lede}
        action={
          <ButtonLink href={SERVICES_INTRO.action.href} variant="ghost" arrow>
            {SERVICES_INTRO.action.label}
          </ButtonLink>
        }
      />

      <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s, i) => (
          <Reveal as="li" key={s.title} delay={(i % 3) * 0.06} className="flex flex-col bg-card p-6 md:p-8">
            <span className="inline-flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary">
              <s.icon aria-hidden className="size-5" />
            </span>
            <h3 className="text-h3 mt-6">
              {s.title}
              {s.confirm && <Confirm note={s.confirm} />}
            </h3>
            <p className="mt-2 text-muted">{s.line}</p>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
