import { Info, TrendingDown, TrendingUp, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "../../component/ui/panel";
import { EmptyState, ErrorState, Skeleton } from "../../component/ui/feedback";
import type { AttendanceSummary, InsightTone } from "../../lib/insights";
import { plural } from "../../lib/format";

const toneStyle: Record<InsightTone, { cls: string; Icon: typeof TrendingUp }> = {
  positive: { cls: "bg-(--pp-present-soft) text-(--pp-present)", Icon: TrendingUp },
  neutral: { cls: "bg-(--pp-iris-soft) text-(--pp-iris)", Icon: Info },
  attention: { cls: "bg-(--pp-warn-soft) text-(--pp-warn)", Icon: TrendingDown },
};

interface InsightsPanelProps {
  summary: AttendanceSummary;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** Plain-language observations counted from the child's recorded sessions. */
export function InsightsPanel({ summary, loading, error, onRetry }: InsightsPanelProps) {
  return (
    <Panel className="flex flex-col lg:col-span-5">
      <PanelHeader icon={<Sparkle className="size-4" />} eyebrow="What stands out" title="Patterns in attendance" />
      <div className="flex-1 px-5 pt-4 pb-5 sm:px-6">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState title="We couldn't load attendance" message={error} onRetry={onRetry} />
        ) : summary.insights.length === 0 ? (
          <EmptyState
            compact
            icon={<Sparkle className="size-5" />}
            title="Nothing to report yet"
            description="Patterns appear here once a few sessions have been recorded."
          />
        ) : (
          <ul className="space-y-4">
            {summary.insights.map((ins) => {
              const { cls, Icon } = toneStyle[ins.tone];
              return (
                <li key={ins.id} className="flex gap-3">
                  <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-xl", cls)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-5 text-(--pp-text)">{ins.title}</p>
                    <p className="mt-0.5 text-[13px] leading-5 text-(--pp-muted)">{ins.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {!loading && !error && summary.total > 0 && (
        <p className="border-t border-(--pp-line) px-5 py-3 text-[12px] text-(--pp-subtle) sm:px-6">
          Counted from {plural(summary.total, "recorded session")}. These are observations, not predictions.
        </p>
      )}
    </Panel>
  );
}
