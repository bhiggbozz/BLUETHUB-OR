import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@bluethub/ui-kit";
import CourseHeader from "./course-header";
import CourseProgressCard from "./course-progress-card";
import OverviewTab from "./overview-tab";
import TopicsTab from "./topics-tab";
import AssessmentsTab from "./assessments-tab";
import PdfsTab from "./pdfs-tab";

interface CourseTabConfig {
  value: "overview" | "topics" | "assessments" | "pdfs";
  label: string;
  Component: React.ComponentType;
}

const courseTabs: CourseTabConfig[] = [
  { value: "overview", label: "Overview", Component: OverviewTab },
  { value: "topics", label: "Topics", Component: TopicsTab },
  { value: "assessments", label: "Assessments", Component: AssessmentsTab },
  { value: "pdfs", label: "PDFs", Component: PdfsTab },
];

const tabTriggerClasses =
  "py-2 px-[4px] text-xs data-[state=active]:bg-[#4F61E8] data-[state=active]:text-white sm:text-sm";

export default function SubjectList() {
  return (
    <div className="mx-auto w-full">
      <CourseHeader />
      <div className="mt-2.75">
        <CourseProgressCard />
      </div>
      <Tabs defaultValue={courseTabs[0].value} className="mt-4">
        <TabsList
          className="grid w-full !h-[45px] rounded-xl bg-white p-1"
          style={{ gridTemplateColumns: `repeat(${courseTabs.length}, minmax(0, 1fr))` }}>
          {courseTabs.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className={tabTriggerClasses}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {courseTabs.map(({ value, Component }) => (
          <TabsContent key={value} value={value} className="mt-4">
            <Component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}