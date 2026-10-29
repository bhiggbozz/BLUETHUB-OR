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
import { cn } from "@/lib/utils";

// The dialog and its concept mockups load only when someone first opens a preview.
const RoadmapPreviewDialog = lazy(() => import("./RoadmapPreviewDialog"));

/** One status system for the whole section: filled dot = next up, ring = later. */
function StatusDot({ group, className }: { group: RoadmapGroup["id"]; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        group === "next" ? "bg-primary shadow-[0_0_0_4px_var(--color-primary-soft)]" : "border-[1.5px] border-muted-foreground",
        className,
      )}
    />
  );
}

function GroupHeading({ group, first }: { group: RoadmapGroup; first: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <StatusDot group={group.id} />
      <h3 className="text-sm font-semibold tracking-[0.14em] text-heading uppercase">{group.label}</h3>
      <span className="text-caption tabular-nums">
        {group.when}
        {first && <Confirm note={ROADMAP.timingConfirm} />}
      </span>
      {/* Connector: solid and drawn in for "next", dotted for "later". */}
      <span aria-hidden className="relative h-px flex-1 overflow-hidden">
        <span
          className={cn(
            "draw-line absolute inset-0",
            group.id === "next"
              ? "bg-gradient-to-r from-primary/70 via-primary/30 to-transparent"
              : "bg-[repeating-linear-gradient(90deg,var(--color-border-strong)_0_4px,transparent_4px_10px)]",
          )}
        />
      </span>
    </div>
  );
}

function RoadmapCard({ item, group, onPreview }: { item: RoadmapItem; group: RoadmapGroup["id"]; onPreview: () => void }) {
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
        <StatusDot group={group} className="sm:mt-2" />
      </div>
      <h4 className="mt-6 text-lg font-semibold tracking-[-0.01em] text-heading max-sm:sr-only">
        {item.name}
        {item.confirm && <Confirm note={item.confirm} />}
        <span className="sr-only">, {group === "next" ? "next up" : "later"}</span>
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
  const mailto = `mailto:${SITE.email}?subject=${encodeURIComponent(ROADMAP.cta.subject)}`;

  return (
    <Section id="roadmap" labelledBy="roadmap-title">
      <div aria-hidden className="bg-grain pointer-events-none absolute inset-0" />
      <SectionHeader
        id="roadmap-title"
        eyebrow={ROADMAP.eyebrow}
        title={ROADMAP.title}
        lede={ROADMAP.lede}
        action={
          <Cta href={mailto} tone="secondary" arrow>
            {ROADMAP.cta.label}
          </Cta>
        }
      />

      <div className="space-y-14 md:space-y-16">
        {ROADMAP.groups.map((group, gi) => (
          <section key={group.id} aria-label={`${group.label}, ${group.when}`} className="relative">
            {group.id === "next" && (
              // Accent glow behind the "Next up" row: decorative, static.
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-[10%] top-10 -bottom-6 -z-0 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-primary)_14%,transparent),transparent)] blur-2xl"
              />
            )}
            <Reveal className="relative">
              <GroupHeading group={group} first={gi === 0} />
            </Reveal>
            <ul className="relative mt-6 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
              <Stagger>
                {group.items.map((item) => (
                  <Reveal as="li" key={item.id} className="sm:last:col-span-2 lg:last:col-span-1">
                    <RoadmapCard item={item} group={group.id} onPreview={() => {
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
