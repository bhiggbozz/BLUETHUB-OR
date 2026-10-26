import { PAINS, PROBLEM } from "@/data/home";
import { Cta } from "@/components/common/Cta";
import { Reveal, Rotate, Stagger } from "@/components/common/motion";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

/** Decorative outlined asterisk that turns as the section scrolls past (md+ only). */
function ScrollShape() {
  return (
    <Rotate mode="scroll" className="pointer-events-none absolute -top-28 -right-40 size-72 text-border-strong opacity-70 max-md:hidden">
      <svg viewBox="0 0 200 200" className="size-full" fill="none" stroke="currentColor" strokeWidth="1.5">
        {[0, 30, 60, 90, 120, 150].map((a) => (
          <rect key={a} x="92" y="10" width="16" height="180" rx="8" transform={`rotate(${a} 100 100)`} />
        ))}
      </svg>
    </Rotate>
  );
}

export function Problem() {
  return (
    <Section id="problem" labelledBy="problem-title" className="overflow-hidden">
      <ScrollShape />
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
            <Reveal as="li" key={p.title} className="group flex flex-col bg-card p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
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
