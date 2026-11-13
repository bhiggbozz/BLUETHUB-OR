import { useEffect, useState } from "react";
import { performanceService, type SubjectPerformanceDto } from "@/services/performance";
import { Loader2 } from "lucide-react";

const Charts = () => {
  const [subjects, setSubjects] = useState<SubjectPerformanceDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const res = await performanceService.getAdminDashboard();
        const d = res.data?.data;
        if (!cancelled && d) setSubjects(d.subjectPerformances ?? []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, []);

  // Ranked, largest first — one series (every bar is the same metric), so
  // every bar takes the same slot-1 brand hue rather than a rainbow: color
  // isn't doing identity work here, the row label already is.
  const ranked = [...subjects].sort((a, b) => b.averageScorePercent - a.averageScorePercent);
  const maxScore = Math.max(...ranked.map((s) => s.averageScorePercent), 1);

  return (
    <section className="font-poppins space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Subject performance — takes 5/5 */}
        <div className="md:col-span-5 bg-card rounded-md p-4 shadow-sm border border-border">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-foreground">Subject Performance</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Average scores this term</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : ranked.length === 0 ? (
            <p className="text-xs text-muted-foreground">No subject performance data available.</p>
          ) : (
            <div className="flex items-end gap-2 overflow-x-auto pt-5 sm:gap-4">
              {ranked.map((s) => {
                const isZero = s.averageScorePercent <= 0;
                const pct = Math.max((s.averageScorePercent / maxScore) * 100, 4);
                return (
                  <div
                    key={s.subjectId}
                    className="group flex min-w-[48px] flex-1 flex-col items-center"
                    title={`${s.subjectName}: ${s.averageScorePercent.toFixed(1)}%`}
                  >
                    {/* Track: fixed-height column, bar grows from the
                        baseline. Square at the baseline, rounded-md only at
                        the data end (top) — never rounded at the bottom.
                        A true zero gets its own flat baseline tick instead
                        of a near-invisible sliver, so it reads as "zero,"
                        not as missing data. */}
                    <div className="relative flex h-32 w-full items-end justify-center border-b border-border">
                      {isZero ? (
                        <>
                          <div className="h-[2px] w-5 rounded-full bg-chestnut/40 sm:w-6" />
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-muted-foreground">
                            0%
                          </span>
                        </>
                      ) : (
                        <div
                          className="relative w-5 rounded-t-md bg-chestnut transition-[height] duration-300 ease-out group-hover:bg-chestnut/85 sm:w-6"
                          style={{ height: `${pct}%` }}
                        >
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-foreground">
                            {s.averageScorePercent.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="mt-2 line-clamp-2 text-center text-[10px] font-medium leading-tight text-muted-foreground">
                      {s.subjectName}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Charts;
