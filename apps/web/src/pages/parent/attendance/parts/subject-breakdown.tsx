import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "../../component/ui/panel";
import { EmptyState, Skeleton } from "../../component/ui/feedback";
import { Meter } from "../../component/ui/data-viz";
import { fadeUp, stagger } from "../../component/ui/motion";
import type { SubjectSummary } from "../../lib/insights";

interface Props {
  subjects: SubjectSummary[];
  loading: boolean;
  activeQuery: string;
  onPick: (name: string) => void;
}

/** Per-subject attendance counted from history. Clicking a subject searches the history for it. */
export function SubjectBreakdown({ subjects, loading, activeQuery, onPick }: Props) {
  return (
    <Panel className="lg:sticky lg:top-6">
      <PanelHeader icon={<Layers className="size-4" />} eyebrow="All recorded history" title="By subject" />
      <div className="px-3 pt-3 pb-4 sm:px-4">
        {loading ? (
          <div className="space-y-4 px-2 py-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <EmptyState
            compact
            icon={<Layers className="size-5" />}
            title="No subject sessions yet"
            description="Subject attendance appears once teachers record it."
          />
        ) : (
          <motion.ul variants={stagger(0.04)} initial="hidden" animate="show" className="space-y-1">
            {subjects.map((s) => {
              const active = activeQuery.toLowerCase() === s.name.toLowerCase();
              return (
                <motion.li key={s.name} variants={fadeUp}>
                  <button
                    type="button"
                    onClick={() => onPick(active ? "" : s.name)}
                    aria-pressed={active}
                    className={cn(
                      "w-full rounded-2xl px-3 py-2.5 text-left transition-colors",
                      active ? "bg-(--pp-iris-soft)" : "hover:bg-(--pp-sunken)",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] font-semibold text-(--pp-text)">{s.name}</span>
                      <span className="pp-num shrink-0 text-[13px] font-semibold text-(--pp-text)">{s.rate}%</span>
                    </div>
                    <Meter value={s.rate} className="mt-2" />
                    <p className="mt-1.5 text-[11px] text-(--pp-subtle)">
                      {s.present} of {s.total} sessions
                    </p>
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>
    </Panel>
  );
}
