import { lazy, Suspense, useState } from "react";
import { ArrowUpRight, Eye } from "lucide-react";
import { Card } from "@bluethub/ui-kit/components/ui/card";
import { ROADMAP, type RoadmapGroup, type RoadmapItem } from "@/data/home";
import { SITE } from "@/data/site";
import { Confirm } from "@/components/common/Confirm";
import { Cta } from "@/components/common/Cta";
import { Reveal, Stagger } from "@/components/common/motion";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

// The dialog and its concept mockups load only when someone first opens a preview.
const RoadmapPreviewDialog = lazy(() => import("./RoadmapPreviewDialog"));

function GroupHeading({ group, first }: { group: RoadmapGroup; first: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="inline-block size-2 shrink-0 rounded-full border-[1.5px] border-muted-foreground" />
      <h3 className="text-sm font-semibold tracking-[0.14em] text-heading uppercase">{group.label}</h3>
      <span className="text-caption tabular-nums">
        {group.when}
        {first && <Confirm note={ROADMAP.timingConfirm} />}
      </span>
      {/* Dotted connector: these features are further out. */}
      <span aria-hidden className="relative h-px flex-1 overflow-hidden">
        <span className="draw-line absolute inset-0 bg-[repeating-linear-gradient(90deg,var(--color-border-strong)_0_4px,transparent_4px_10px)]" />
      </span>
    </div>
  );
}

function RoadmapCard({ item, onPreview }: { item: RoadmapItem; onPreview: () => void }) {
  return (
    <Card className="card-lift group h-full gap-0 rounded-lg border-border p-5 shadow-soft sm:p-6 md:p-8">
      {/* Phone: icon and title share a row. Larger screens: icon above. */}
      <div className="flex items-center gap-4 sm:items-start sm:justify-between">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary sm:size-11">
          <item.icon aria-hidden className="icon-spring size-5" />
        </span>
        {/* Visual duplicate of the heading below, which stays the semantic h4. */}
        <span aria-hidden className="flex-1 text-lg font-semibold tracking-[-0.01em] text-heading sm:hidden">
          {item.name}
        </span>
      </div>
      <h4 className="mt-6 text-lg font-semibold tracking-[-0.01em] text-heading max-sm:sr-only">
        {item.name}
        {item.confirm && <Confirm note={item.confirm} />}
        <span className="sr-only">, later</span>
      </h4>
      <p className="mt-3 max-w-[60ch] flex-1 text-[0.9375rem] text-muted-foreground sm:mt-2">{item.line}</p>
      <button
        type="button"
        onClick={onPreview}
        className="mt-4 inline-flex w-fit items-center gap-1.5 sm:mt-6 rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline"
        aria-label={`Preview the ${item.name} concept`}
      >
        <Eye aria-hidden className="size-4" />
        Preview
      </button>
    </Card>
  );
}

export function Roadmap() {
  const [open, setOpen] = useState<RoadmapItem | null>(null);
  // Stays true after the first open so the dialog can animate out and restore focus.
  const [everOpened, setEverOpened] = useState(false);
  const mailto = `mailto:${SITE.email}?subject=${encodeURIComponent(ROADMAP.featureRequestSubject)}`;

  return (
    <Section id="roadmap" labelledBy="roadmap-title">
      <div aria-hidden className="bg-grain pointer-events-none absolute inset-0" />
      <SectionHeader
        id="roadmap-title"
        eyebrow={ROADMAP.eyebrow}
        title={ROADMAP.title}
        lede={ROADMAP.lede}
        action={
          <Cta href={ROADMAP.action.href} tone="secondary" arrow>
            {ROADMAP.action.label}
          </Cta>
        }
      />

      <div className="space-y-14 md:space-y-16">
        {ROADMAP.groups.map((group, gi) => (
          <section key={group.id} aria-label={`${group.label}, ${group.when}`} className="relative">
            <Reveal className="relative">
              <GroupHeading group={group} first={gi === 0} />
            </Reveal>
            <ul className="relative mt-6 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
              <Stagger>
                {group.items.map((item) => (
                  <Reveal as="li" key={item.id} className="sm:last:col-span-2 lg:last:col-span-1">
                    <RoadmapCard item={item} onPreview={() => {
                        setEverOpened(true);
                        setOpen(item);
                      }} />
                  </Reveal>
                ))}
              </Stagger>
            </ul>
          </section>
        ))}
      </div>

      <Reveal className="mt-14 flex flex-col items-start gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.9375rem] text-muted-foreground">
          Something your school needs that isn't here? We read every request.
        </p>
        <a
          href={mailto}
          className="group inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-primary underline-offset-4 hover:underline"
        >
          Tell us what to build next
          <ArrowUpRight aria-hidden className="arrow-nudge size-4" />
        </a>
      </Reveal>

      {everOpened && (
        <Suspense fallback={null}>
          <RoadmapPreviewDialog item={open} onClose={() => setOpen(null)} />
        </Suspense>
      )}
    </Section>
  );
}
