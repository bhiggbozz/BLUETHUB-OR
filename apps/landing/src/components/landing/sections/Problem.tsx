import { PAINS, PROBLEM } from "@/data/home";
import { Cta } from "@/components/common/Cta";
import { Reveal, Stagger } from "@/components/common/motion";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

export function Problem() {
  return (
    <Section id="problem" labelledBy="problem-title">
      <SectionHeader
        id="problem-title"
        eyebrow={PROBLEM.eyebrow}
        title={PROBLEM.title}
        lede={PROBLEM.lede}
        action={
          <Cta href={PROBLEM.action.href} tone="ghost" arrow>
            {PROBLEM.action.label}
          </Cta>
        }
      />
      <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
        <Stagger>
          {PAINS.map((p) => (
            <Reveal as="li" key={p.title} className="group flex flex-col bg-card p-6 sm:last:col-span-2 lg:last:col-span-1">
              <span className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors duration-200 group-hover:text-heading">
                <p.icon aria-hidden className="rotate-on-hover size-5" />
              </span>
              <h3 className="text-h4 mt-5">{p.title}</h3>
              <p className="mt-2 text-[0.9375rem] text-muted-foreground">{p.line}</p>
            </Reveal>
          ))}
        </Stagger>
      </ul>
    </Section>
  );
}
