import { useEffect, useRef, useState } from "react";
import { performanceService, type AdminDashboardOverviewDto, type SubjectPerformanceDto } from "@/services/performance";
import { Loader2 } from "lucide-react";

// Pass-rate bands for the right-hand card (percent of attempts passed).
const STRONG_PASS = 70;
const STEADY_PASS = 50;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const Charts = () => {
  const [subjects, setSubjects] = useState<SubjectPerformanceDto[]>([]);
  const [overview, setOverview] = useState<AdminDashboardOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const res = await performanceService.getAdminDashboard();
        const d = res.data?.data;
        if (!cancelled && d) {
          setSubjects(d.subjectPerformances ?? []);
          setOverview(d.overview ?? null);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, []);

  const empty = !loading && subjects.length === 0;

  return (
    <section className="font-poppins">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="lg:col-span-3 min-w-0 bg-card rounded-md p-4 shadow-sm border border-border">
          {loading ? <Spinner /> : empty ? <Empty /> : <SubjectBars subjects={subjects} overview={overview} />}
        </div>
        <div className="lg:col-span-2 min-w-0 bg-card rounded-md p-4 shadow-sm border border-border">
          {loading ? <Spinner /> : empty ? <Empty /> : <PassRateGauge subjects={subjects} overview={overview} />}
        </div>
      </div>
    </section>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center py-10">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

const Empty = () => <p className="py-6 text-xs text-muted-foreground">No subject performance data available.</p>;

/**
 * Average score per subject, lowest to highest, so the leader lands on the
 * right as the one solid bar. Every other bar is the same hue, faded: one
 * series, so color only marks "the top subject", never identity.
 */
function SubjectBars({ subjects, overview }: { subjects: SubjectPerformanceDto[]; overview: AdminDashboardOverviewDto | null }) {
  const ordered = [...subjects].sort((a, b) => a.averageScorePercent - b.averageScorePercent);
  const top = ordered[ordered.length - 1];
  const maxScore = Math.max(top.averageScorePercent, 1);
  const schoolAvg = overview?.overallAverageScore ?? mean(subjects.map((s) => s.averageScorePercent));
  const lead = top.averageScorePercent - schoolAvg;

  // On narrow screens the row scrolls; start at the right end so the
  // highlighted leader is in view instead of hidden past the edge.
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [subjects]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Subject Performance</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">This term · average score by subject</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {lead >= 0 ? "+" : ""}
              {lead.toFixed(1)} pts
            </span>{" "}
            {top.subjectName} vs school average
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {schoolAvg.toFixed(0)}% school average · {subjects.length} subjects
          </p>
        </div>
      </div>

      {/* pt-6: room for the value label over the tallest bar, which overflow-x-auto would otherwise clip. */}
      <ul ref={listRef} className="mt-2 flex items-stretch gap-1.5 overflow-x-auto pt-6 pb-1 sm:gap-2" aria-label="Average score by subject">
        {ordered.map((s) => {
          const isTop = s === top;
          // A sliver for very low scores, so the slot still reads as a bar.
          const pct = Math.max((s.averageScorePercent / maxScore) * 100, 2);
          return (
            <li
              key={s.subjectId}
              className="group flex min-w-[44px] flex-1 flex-col items-center"
              title={`${s.subjectName}: ${s.averageScorePercent.toFixed(1)}%`}
            >
              <div className="relative flex h-44 w-full items-end sm:h-52">
                <div
                  className={`relative w-full rounded-[3px] transition-[height,background-color] duration-300 ease-out ${
                    isTop ? "bg-chestnut" : "bg-chestnut/25 group-hover:bg-chestnut/40"
                  }`}
                  style={{ height: `${pct}%` }}
                >
                  <span
                    className={`absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-foreground transition-opacity ${
                      isTop ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {s.averageScorePercent.toFixed(0)}%
                  </span>
                </div>
              </div>
              <span
                className={`mt-2 w-full truncate text-center text-[11px] leading-tight ${
                  isTop ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.subjectName}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * School pass rate as a half-dial, then every subject sorted into a pass-rate
 * band: one strip shows the balance, and the subjects below the lowest band
 * are named so the admin knows where to look first.
 */
function PassRateGauge({ subjects, overview }: { subjects: SubjectPerformanceDto[]; overview: AdminDashboardOverviewDto | null }) {
  const passRate = Math.min(Math.max(overview?.overallPassRate ?? mean(subjects.map((s) => s.passRate)), 0), 100);

  const bands = [
    { key: "strong", label: "Strong", hint: `${STRONG_PASS}%+`, cls: "bg-chestnut", items: subjects.filter((s) => s.passRate >= STRONG_PASS) },
    {
      key: "steady",
      label: "Steady",
      hint: `${STEADY_PASS}–${STRONG_PASS - 1}%`,
      cls: "bg-chestnut/50",
      items: subjects.filter((s) => s.passRate >= STEADY_PASS && s.passRate < STRONG_PASS),
    },
    {
      key: "risk",
      label: "Needs attention",
      hint: `under ${STEADY_PASS}%`,
      cls: "bg-chestnut/15",
      items: subjects.filter((s) => s.passRate < STEADY_PASS),
    },
  ];
  const atRisk = [...bands[2].items].sort((a, b) => a.passRate - b.passRate);

  return (
    <div className="flex h-full flex-col">
      <h3 className="text-sm font-semibold text-foreground">Pass Rate</h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">Share of completed attempts that passed</p>

      {/* Half-dial: pathLength=100 lets the dash length be the percentage. */}
      <div className="relative mx-auto mt-4 w-full max-w-[220px]">
        <svg viewBox="0 0 200 110" className="w-full" role="img" aria-label={`School pass rate ${passRate.toFixed(0)}%`}>
          <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-chestnut/10" />
          <path
            d="M 15 100 A 85 85 0 0 1 185 100"
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${passRate} 100`}
            className="stroke-chestnut transition-[stroke-dasharray] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-3xl font-semibold leading-none tabular-nums text-foreground">{passRate.toFixed(0)}%</p>
          <p className="mt-1 text-[10px] text-muted-foreground">school-wide</p>
        </div>
      </div>

      <div className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        {bands.map((b) =>
          b.items.length ? <div key={b.key} className={b.cls} style={{ width: `${(b.items.length / subjects.length) * 100}%` }} /> : null,
        )}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {bands.map((b) => (
          <li key={b.key} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`size-2 shrink-0 rounded-full ${b.cls} ${b.key === "risk" ? "ring-1 ring-chestnut/40" : ""}`} />
              <span className="truncate text-[11px] text-muted-foreground">{b.label}</span>
            </div>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
              {b.items.length}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">{b.hint}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4">
        {atRisk.length ? (
          <>
            <p className="text-[11px] text-muted-foreground">Look at first</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {atRisk.slice(0, 4).map((s) => (
                <span
                  key={s.subjectId}
                  className="inline-flex items-center gap-1 rounded-full border border-chestnut/20 bg-chestnut/5 px-2 py-0.5 text-[11px] text-foreground"
                >
                  {s.subjectName}
                  <span className="tabular-nums text-muted-foreground">{s.passRate.toFixed(0)}%</span>
                </span>
              ))}
              {atRisk.length > 4 && <span className="px-1 py-0.5 text-[11px] text-muted-foreground">+{atRisk.length - 4} more</span>}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">Every subject passes at least {STEADY_PASS}% of attempts.</p>
        )}
      </div>
    </div>
  );
}

export default Charts;
