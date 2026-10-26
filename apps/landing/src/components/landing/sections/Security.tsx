import { SECURITY, SECURITY_POINTS } from "@/data/home";
import { Confirm } from "@/components/common/Confirm";
import { Cta } from "@/components/common/Cta";
import { Reveal, Rotate, Stagger } from "@/components/common/motion";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

/** A segmented ring that turns with scroll (md+), echoing "separate spaces". */
function ScrollRing() {
  return (
    <Rotate mode="scroll" className="pointer-events-none absolute -bottom-24 -left-28 size-80 text-white/10 max-md:hidden">
      <svg viewBox="0 0 200 200" className="size-full" fill="none" stroke="currentColor" strokeWidth="10">
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} d="M100 10 a90 90 0 0 1 63.6 26.4" transform={`rotate(${i * 45} 100 100)`} strokeLinecap="round" />
        ))}
      </svg>
    </Rotate>
  );
}

export function Security() {
  return (
    <Section id="security" tone="ink" labelledBy="security-title" className="overflow-hidden">
      <ScrollRing />
      <SectionHeader
        id="security-title"
        onInk
        eyebrow={SECURITY.eyebrow}
        title={
          <>
            {SECURITY.title}
            <Confirm note={SECURITY.confirm} />
          </>
        }
        lede={SECURITY.lede}
        action={
          <Cta href={SECURITY.action.href} tone="inkSecondary" arrow>
            {SECURITY.action.label}
          </Cta>
        }
      />
      <ul className="relative grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        <Stagger>
          {SECURITY_POINTS.map((p) => (
            <Reveal as="li" key={p.title} className="group">
              <span className="inline-flex size-11 items-center justify-center rounded-md border border-white/15 bg-white/[0.05] text-blue-200">
                <p.icon aria-hidden className="rotate-on-hover size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {p.title}
                {p.confirm && <Confirm note={p.confirm} />}
              </h3>
              <p className="mt-2 text-[0.9375rem] text-ink-muted">{p.line}</p>
            </Reveal>
          ))}
        </Stagger>
      </ul>
    </Section>
  );
}
