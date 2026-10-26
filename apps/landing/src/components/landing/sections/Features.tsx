import { Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@bluethub/ui-kit/components/ui/tabs";
import { FEATURES_INTRO, ROLES, type RoleId } from "@/data/home";
import { Cta } from "@/components/common/Cta";
import { Reveal } from "@/components/common/motion";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AdminDashboardMock } from "../mockups/AdminDashboardMock";
import { ParentOverviewMock } from "../mockups/ParentOverviewMock";
import { StudentAssessmentMock } from "../mockups/StudentAssessmentMock";
import { WhiteboardMock } from "../mockups/WhiteboardMock";
import { MockupViewport } from "../mockups/MockupViewport";

const MOCKUP: Record<RoleId, React.ComponentType<{ className?: string }>> = {
  leaders: AdminDashboardMock,
  teachers: WhiteboardMock,
  students: StudentAssessmentMock,
  parents: ParentOverviewMock,
};

/** Features by role, on the shared shadcn Tabs (keyboard: arrow keys move between roles). */
export function Features() {
  return (
    <Section id="features" tone="tint" labelledBy="features-title">
      <SectionHeader
        id="features-title"
        eyebrow={FEATURES_INTRO.eyebrow}
        title={FEATURES_INTRO.title}
        lede={FEATURES_INTRO.lede}
        action={
          <Cta href={FEATURES_INTRO.action.href} tone="secondary" arrow>
            {FEATURES_INTRO.action.label}
          </Cta>
        }
      />

      <Reveal>
        <Tabs defaultValue="leaders" className="gap-10">
          <div>
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1 group-data-[orientation=horizontal]/tabs:h-auto sm:inline-flex sm:w-fit">
              {ROLES.map((r) => (
                <TabsTrigger
                  key={r.id}
                  value={r.id}
                  className="h-10 rounded-md px-4 text-[0.9375rem] font-semibold data-[state=active]:bg-card data-[state=active]:text-heading data-[state=active]:shadow-soft dark:data-[state=active]:bg-accent"
                >
                  {r.tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {ROLES.map((r) => {
            const Mock = MOCKUP[r.id];
            return (
              <TabsContent key={r.id} value={r.id} className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-8">
                <div className="min-w-0 lg:col-span-5">
                  <p className="text-caption font-medium">{r.who}</p>
                  <h3 className="text-h2 mt-3">{r.title}</h3>
                  <ul className="mt-8 space-y-3.5">
                    {r.points.map((pt) => (
                      <li key={pt} className="flex gap-3">
                        <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                          <Check aria-hidden className="icon-bold size-3" />
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                  {r.note && <p className="text-caption mt-6 border-l-2 border-primary pl-3">{r.note}</p>}
                </div>
                <div className="min-w-0 lg:col-span-7">
                  <MockupViewport>
                    <Mock />
                  </MockupViewport>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </Reveal>

    </Section>
  );
}
