import { cn } from "@/lib/utils";
import { Card, CardContent } from "@bluethub/ui-kit";
import { Target, Trophy, Users } from "lucide-react";
import type { PerformanceStats } from "../interfaces";

function toOrdinal(n: number) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// Matches PerformanceCard's exact layout (icon + label, then either the
// score block or the empty-state block) so the loading → loaded swap
// doesn't shift height or reflow the two-column grid.
function PerformanceCardSkeleton() {
  return (
    <Card className="border-none shadow-sm p-0 font-poppins">
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-200" />
          <span className="h-3.5 w-20 animate-pulse rounded bg-slate-200" />
        </div>

        <div className="mt-4 h-8 w-24 animate-pulse rounded bg-slate-200" />

        <div className="mt-4 flex items-center justify-between border-t border-[#F1F1F5] pt-3">
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceCard({
  label,
  accent,
  stats,
}: {
  label: string;
  accent: "quiz" | "assessment";
  stats: PerformanceStats;
}) {
  const hasAttempts = stats.attemptCount > 0 && stats.averageScore !== null;

  const accentStyles =
    accent === "quiz"
      ? {
          iconWrap: "bg-[#4F61E8]/10 text-[#4F61E8]",
          ring: "text-[#4F61E8]",
          badge: "bg-[#4F61E8]/10 text-[#4F61E8]",
        }
      : {
          iconWrap: "bg-[#7C4DFF]/10 text-[#7C4DFF]",
          ring: "text-[#7C4DFF]",
          badge: "bg-[#7C4DFF]/10 text-[#7C4DFF]",
        };

  return (
    <Card className="border-none shadow-sm p-0 font-poppins">
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accentStyles.iconWrap)}>
            <Target className="h-4.5 w-4.5" />
          </span>
          <span className="text-sm font-semibold text-[#3A3A3A]">{label}</span>
        </div>

        {hasAttempts ? (
          <>
            <div className="mt-4 flex items-end gap-1.5">
              <span className={cn("text-3xl font-bold", accentStyles.ring)}>
                {Number.isInteger(stats.averageScore) ? stats.averageScore : stats.averageScore!.toFixed(1)}
              </span>
              <span className="pb-0.5 text-sm font-medium text-[#94A3B8]">% avg. score</span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#F1F1F5] pt-3">
              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] sm:text-sm">
                <Users className="h-3.5 w-3.5" />
                {stats.attemptCount} attempt{stats.attemptCount === 1 ? "" : "s"}
              </div>

              {stats.position !== null && stats.totalStudents > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                    accentStyles.badge
                  )}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  {toOrdinal(stats.position)} of {stats.totalStudents}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 flex flex-col items-start gap-1">
            <span className="text-lg font-semibold text-[#B8B8C7]">No attempts yet</span>
            <span className="text-xs text-[#B8B8C7] sm:text-sm">
              Your score and class rank will appear here once you take one.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { PerformanceCardSkeleton };
export default PerformanceCard;