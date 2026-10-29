import { CalendarRange, Clock, Gauge, Layers, ListChecks } from "lucide-react";
import type { ParentChild } from "@/services/parent";
import { ChildAvatar } from "../../component/ui/child-avatar";
import { AnimatedNumber } from "../../component/ui/data-viz";
import { childName, shortDate } from "../../lib/format";

interface SummaryAsideProps {
  child: ParentChild;
  fromDate: string;
  toDate: string;
  topicNames: string[];
  totalQuestions: number;
  timeLimitMinutes: number;
  passMarkPercent: number;
  step: number;
}

/** Live recap of the choices so far. Sticky beside the wizard on large screens. */
export function SummaryAside(p: SummaryAsideProps) {
  const period =
    p.fromDate && p.toDate
      ? `${shortDate(new Date(`${p.fromDate}T00:00:00`))} – ${shortDate(new Date(`${p.toDate}T00:00:00`))}`
      : "Not set";

  return (
    <aside className="pp-spotlight p-5 lg:sticky lg:top-6" aria-label="Assessment summary">
      <p className="pp-eyebrow text-white/50!">Assigning to</p>
      <div className="mt-2 flex items-center gap-3">
        <ChildAvatar id={p.child.studentId} firstName={p.child.firstName} lastName={p.child.lastName} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-white">{childName(p.child)}</p>
          <p className="truncate text-[12px] text-white/55">{p.child.classroomName}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-3.5 text-[13px]">
        <Row icon={<CalendarRange className="size-4" />} label="Taught in" value={period} />
        <Row
          icon={<Layers className="size-4" />}
          label="Topics"
          value={p.topicNames.length === 0 ? "None yet" : p.topicNames.length <= 2 ? p.topicNames.join(", ") : `${p.topicNames.length} topics`}
        />
        <Row
          icon={<ListChecks className="size-4" />}
          label="Questions"
          value={p.step < 2 ? "—" : <AnimatedNumber value={p.totalQuestions} className="font-semibold" />}
        />
        <Row
          icon={<Clock className="size-4" />}
          label="Time limit"
          value={p.step < 3 || !Number.isFinite(p.timeLimitMinutes) ? "—" : `${p.timeLimitMinutes} min`}
        />
        <Row
          icon={<Gauge className="size-4" />}
          label="Pass mark"
          value={p.step < 3 || !Number.isFinite(p.passMarkPercent) ? "—" : `${p.passMarkPercent}%`}
        />
      </dl>

      <p className="mt-5 border-t border-white/10 pt-4 text-[12px] leading-5 text-white/50">
        Questions come from your school's own question bank, matched to the topics you pick.
      </p>
    </aside>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="flex w-28 shrink-0 items-center gap-2 text-white/50">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 flex-1 truncate text-right font-medium text-white">{value}</dd>
    </div>
  );
}
