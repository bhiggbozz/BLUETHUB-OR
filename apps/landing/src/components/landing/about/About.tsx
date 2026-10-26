import { ABOUT, TEAM_PLACEHOLDERS, VALUES } from "@/data/home";
import { ButtonLink } from "@/components/common/Button";
import { Confirm } from "@/components/common/Confirm";
import { MediaPlaceholder, PlaceholderTag } from "@/components/common/Placeholder";
import { Reveal } from "@/components/common/Reveal";
import { Section } from "@/components/common/Section";

export function About() {
  return (
    <Section id="about" tone="tint" labelledBy="about-title">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow">{ABOUT.eyebrow}</p>
          <h2 id="about-title" className="text-h2 mt-4">
            {ABOUT.title}
          </h2>
        </Reveal>
        <Reveal delay={0.06} className="space-y-5 lg:col-span-6 lg:col-start-7">
          {ABOUT.story.map((para, i) => (
            <p key={i} className={i === 0 ? "text-lede text-foreground" : "text-muted"}>
              {para}
              {i === 0 && <Confirm note={ABOUT.storyConfirm} />}
            </p>
          ))}
          <ButtonLink href={ABOUT.action.href} variant="ghost" arrow>
            {ABOUT.action.label}
          </ButtonLink>
        </Reveal>
      </div>

      <div className="mt-16 md:mt-24">
        <h3 className="text-h3">What we hold ourselves to</h3>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <Reveal as="li" key={v.title} delay={i * 0.05} className="bg-card p-6">
              <h4 className="text-h4">{v.title}</h4>
              <p className="mt-2 text-[0.9375rem] text-muted">{v.line}</p>
            </Reveal>
          ))}
        </ul>
      </div>

      <div className="mt-16 md:mt-24">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-h3">The team</h3>
          <PlaceholderTag>Photos, names and roles needed</PlaceholderTag>
        </div>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: TEAM_PLACEHOLDERS }).map((_, i) => (
            <Reveal as="li" key={i} delay={i * 0.06}>
              <MediaPlaceholder label="Team photo" ratio="aspect-[4/5]" />
              <p className="mt-4 font-semibold text-heading">Name</p>
              <p className="text-caption">Role</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
