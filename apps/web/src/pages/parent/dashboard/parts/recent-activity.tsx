import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import type { AttendanceHistoryItem } from "@/services/attendance";
import { Panel, PanelHeader } from "../../component/ui/panel";
import { EmptyState, ErrorState, Skeleton } from "../../component/ui/feedback";
import { SessionRow } from "../../component/ui/session-row";
import { dayLabel } from "../../lib/format";

interface RecentActivityProps {
  items: AttendanceHistoryItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  firstName: string;
}

const LIMIT = 6;

export function RecentActivity({ items, loading, error, onRetry, firstName }: RecentActivityProps) {
  const recent = items.slice(0, LIMIT);

  // Group consecutive rows under a day heading.
  const groups: { label: string; rows: AttendanceHistoryItem[] }[] = [];
  for (const item of recent) {
    const label = dayLabel(new Date(item.startedAt));
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(item);
    else groups.push({ label, rows: [item] });
  }

  return (
    <Panel className="lg:col-span-7">
      <PanelHeader
        eyebrow="Timeline"
        title="Recent sessions"
        action={
          items.length > 0 && (
            <Link
              to="/parent/attendance"
              className="group inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-(--pp-iris) transition-colors hover:bg-(--pp-iris-soft)"
            >
              All history <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )
        }
      />
      <div className="pt-3 pb-3">
        {loading ? (
          <div className="space-y-4 px-5 py-2 sm:px-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3.5">
                <Skeleton className="size-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-5 sm:px-6">
            <ErrorState title="We couldn't load recent sessions" message={error} onRetry={onRetry} />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarDays className="size-5" />}
            title="No sessions recorded yet"
            description={`When ${firstName}'s teachers take attendance, each session shows up here.`}
          />
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <p className="pp-eyebrow px-5 pt-2 pb-1 sm:px-6">{g.label}</p>
              <ul>
                {g.rows.map((item, i) => (
                  <SessionRow key={item.sessionId} item={item} connector={i < g.rows.length - 1} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
