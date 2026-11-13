import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import {
  DatePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@bluethub/ui-kit";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardX,
  Filter,
  Loader2,
  Menu,
  RefreshCw,
  School,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import {
  attendanceService,
  type AbsentStudentsData,
  type AttendanceAnalyticsBucket,
  type AttendanceAnalyticsData,
  type AttendanceAnalyticsItem,
  type AttendanceAnalyticsParams,
} from "@/services/attendance";
import { moduleService } from "@/services/module";
import { extractErrorMessage } from "@/utils/attendance";
import StudentStatsModal from "./student-stats-modal";

// ── Constants ──────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 0, label: "Daily", hint: "A single day" },
  { value: 1, label: "Weekly", hint: "Week of a date" },
  { value: 2, label: "Monthly", hint: "A single month" },
  { value: 3, label: "Month range", hint: "Several months" },
] as const;

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "0", label: "By Class" },
  { value: "1", label: "By Subject" },
] as const;

const inputCls =
  "w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-card text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-transparent disabled:opacity-50";

interface Option {
  id: string;
  name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toLocalDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function monthKeyOffset(offset: number, base: Date = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth() - offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Merges byClass / bySubject across buckets into one overall per-entity view. */
function aggregateItems(
  buckets: AttendanceAnalyticsBucket[],
  key: "byClass" | "bySubject",
): AttendanceAnalyticsItem[] {
  const map = new Map<string, AttendanceAnalyticsItem>();
  for (const bucket of buckets) {
    for (const it of bucket[key] ?? []) {
      const cur =
        map.get(it.id) ??
        ({ id: it.id, name: it.name, sessions: 0, expected: 0, present: 0, absent: 0, attendanceRate: 0 } as AttendanceAnalyticsItem);
      cur.sessions += it.sessions;
      cur.expected += it.expected;
      cur.present += it.present;
      cur.absent += it.absent;
      cur.attendanceRate = cur.expected > 0 ? round1((cur.present / cur.expected) * 100) : 0;
      map.set(it.id, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.attendanceRate - a.attendanceRate);
}

// ── Presentational components ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Kpi({
  icon,
  label,
  value,
  valueClass,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}</div>
      <p className={`mt-2 text-xl sm:text-2xl font-bold leading-none ${valueClass ?? "text-foreground"}`}>{value}</p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PresentAbsentBar({ present, absent }: { present: number; absent: number }) {
  const total = present + absent;
  if (total <= 0) return null;
  const pPct = round1((present / total) * 100);
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">In school vs not in school</h3>
        <span className="text-[11px] text-muted-foreground">{total} students accounted for</span>
      </div>
      <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pPct}%` }} />
        <div className="h-full bg-rose-400 transition-all" style={{ width: `${100 - pPct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          {present} present ({pPct}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          {absent} not in school ({round1(100 - pPct)}%)
        </span>
      </div>
    </section>
  );
}

function RateBarList({
  items,
  fill,
  emptyText,
}: {
  items: AttendanceAnalyticsItem[];
  fill: string;
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const rate = Math.max(0, Math.min(100, it.attendanceRate));
        return (
          <div key={it.id} className="flex items-center gap-2 sm:gap-3">
            <div className="w-24 sm:w-44 shrink-0 min-w-0">
              <p className="truncate text-xs font-semibold text-foreground" title={it.name}>
                {it.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {it.sessions} session{it.sessions === 1 ? "" : "s"} · {it.present}/{it.expected} present
              </p>
            </div>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-md transition-all"
                style={{ width: `${rate}%`, backgroundColor: fill }}
              />
            </div>
            <div className="w-11 shrink-0 text-right">
              <p className="text-xs font-bold text-foreground">{it.attendanceRate}%</p>
              <p className="text-[10px] font-medium text-rose-500">{it.absent} absent</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendBars({ buckets }: { buckets: AttendanceAnalyticsBucket[] }) {
  const rows = buckets.map((b) => ({
    label: b.label,
    rate: round1(b.totals.attendanceRate),
    absent: b.totals.absent,
  }));
  return (
    <div className="flex h-48 items-end gap-2 sm:gap-3">
      {rows.map((r) => {
        const h = Math.max(3, Math.min(100, r.rate));
        return (
          <div key={r.label} className="flex h-full min-w-0 flex-1 flex-col items-center">
            <span className="text-[10px] font-bold text-foreground">{r.rate}%</span>
            <div className="flex min-h-0 w-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-forestBlue-light to-forestBlue-light/70"
                style={{ height: `${h}%` }}
              />
            </div>
            <span className="mt-1 w-full truncate text-center text-[9px] text-muted-foreground" title={r.label}>
              {r.label}
            </span>
            {r.absent > 0 && (
              <span className="w-full truncate text-center text-[9px] text-rose-500" title={`${r.absent} absent`}>
                -{r.absent}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthlyTable({ buckets }: { buckets: AttendanceAnalyticsBucket[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px] overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="text-foreground">Period</TableHead>
              <TableHead className="text-right text-foreground">Sessions</TableHead>
              <TableHead className="text-right text-foreground">Expected</TableHead>
              <TableHead className="text-right text-foreground">Present</TableHead>
              <TableHead className="text-right text-foreground">Absent</TableHead>
              <TableHead className="text-right text-foreground">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.map((b, i) => (
              <TableRow key={b.label} className={i % 2 === 1 ? "bg-muted/25" : undefined}>
                <TableCell className="font-medium text-foreground">{b.label}</TableCell>
                <TableCell className="text-right text-muted-foreground">{b.totals.sessions}</TableCell>
                <TableCell className="text-right text-muted-foreground">{b.totals.expected}</TableCell>
                <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">{b.totals.present}</TableCell>
                <TableCell className="text-right font-medium text-rose-500 dark:text-rose-400">{b.totals.absent}</TableCell>
                <TableCell className="text-right font-bold text-foreground">{round1(b.totals.attendanceRate)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ClipboardX className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">No attendance captured</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">
        There are no attendance records for the selected period and filters. Try a different date range, or a
        class / subject that has already taken attendance.
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">Could not load attendance analytics</p>
        <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">{message}</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const AttendanceAnalytics = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();

  // ── Filters ──────────────────────────────────────────────────────────────
  const today = useMemo(() => toLocalDateKey(new Date()), []);
  const [period, setPeriod] = useState<number>(0);
  const [dailyDate, setDailyDate] = useState(today);
  const [weekDate, setWeekDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [fromMonth, setFromMonth] = useState(() => monthKeyOffset(5));
  const [toMonth, setToMonth] = useState(today.slice(0, 7));
  const [attType, setAttType] = useState<string>("");
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  // ── Filter data sources ───────────────────────────────────────────────────
  const [classrooms, setClassrooms] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);

  useEffect(() => {
    moduleService
      .getClassrooms({ pageNumber: 1, pageSize: 200 })
      .then((res) => {
        const d = (res.data as any)?.data ?? res.data ?? {};
        const rows: any[] = Array.isArray(d) ? d : d?.classrooms ?? d?.Classrooms ?? [];
        setClassrooms(
          rows
            .map((c) => ({
              id: String(c.id ?? c.classroomId ?? ""),
              name: String(c.name ?? c.className ?? ""),
            }))
            .filter((c) => c.id),
        );
      })
      .catch(() => {
        /* class filter is optional — ignore failures silently */
      });
  }, []);

  useEffect(() => {
    if (!classroomId) {
      setSubjects([]);
      setSubjectId("");
      return;
    }
    moduleService
      .getSubjectsByClassroom(classroomId)
      .then((res) => {
        const obj = (res.data as any)?.data ?? {};
        const major: any[] = obj.majorSubjects ?? obj.MajorSubjects ?? [];
        const minor: any[] = obj.minorSubjects ?? obj.MinorSubjects ?? [];
        setSubjects(
          [...major, ...minor]
            .map((s: any) => ({
              id: String(s.id ?? s.subjectId ?? ""),
              name: String(s.subject ?? s.subjectName ?? s.name ?? ""),
            }))
            .filter((s) => s.id),
        );
      })
      .catch(() => setSubjects([]));
  }, [classroomId]);

  // ── Params + fetch ────────────────────────────────────────────────────────
  const rangeValid = period !== 3 || fromMonth <= toMonth;

  const params = useMemo<AttendanceAnalyticsParams>(() => {
    const p: AttendanceAnalyticsParams = { period };
    if (attType !== "") p.attendanceType = Number(attType);
    if (classroomId) p.classroomId = classroomId;
    if (subjectId) p.subjectId = subjectId;
    // The backend marks month/fromMonth/toMonth as [Required] regardless of
    // period, so always supply all three to satisfy its model validation.
    if (period === 0) {
      p.date = dailyDate;
      p.month = dailyDate.slice(0, 7);
      p.fromMonth = dailyDate.slice(0, 7);
      p.toMonth = dailyDate.slice(0, 7);
    } else if (period === 1) {
      p.date = weekDate;
      p.month = weekDate.slice(0, 7);
      p.fromMonth = weekDate.slice(0, 7);
      p.toMonth = weekDate.slice(0, 7);
    } else if (period === 2) {
      p.month = month;
      p.fromMonth = month;
      p.toMonth = month;
    } else {
      p.fromMonth = fromMonth;
      p.toMonth = toMonth;
      p.month = toMonth;
    }
    return p;
  }, [period, attType, classroomId, subjectId, dailyDate, weekDate, month, fromMonth, toMonth]);

  const [data, setData] = useState<AttendanceAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // ── Absent students (requires a specific class or subject scope) ─────────
  const absentScope = useMemo<{ attendanceType: number; classroomId?: string; subjectId?: string } | null>(() => {
    if (subjectId) return { attendanceType: 1, subjectId };
    if (classroomId) return { attendanceType: 0, classroomId };
    return null;
  }, [classroomId, subjectId]);

  const absentParams = useMemo<AttendanceAnalyticsParams | null>(() => {
    if (!absentScope || !rangeValid) return null;
    const base: AttendanceAnalyticsParams = {
      period,
      attendanceType: absentScope.attendanceType,
      classroomId: absentScope.classroomId,
      subjectId: absentScope.subjectId,
    };
    if (period === 0) {
      base.date = dailyDate;
      base.month = dailyDate.slice(0, 7);
      base.fromMonth = dailyDate.slice(0, 7);
      base.toMonth = dailyDate.slice(0, 7);
    } else if (period === 1) {
      base.date = weekDate;
      base.month = weekDate.slice(0, 7);
      base.fromMonth = weekDate.slice(0, 7);
      base.toMonth = weekDate.slice(0, 7);
    } else if (period === 2) {
      base.month = month;
      base.fromMonth = month;
      base.toMonth = month;
    } else {
      base.fromMonth = fromMonth;
      base.toMonth = toMonth;
      base.month = toMonth;
    }
    return base;
  }, [absentScope, rangeValid, period, dailyDate, weekDate, month, fromMonth, toMonth]);

  const [absentData, setAbsentData] = useState<AbsentStudentsData | null>(null);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [absentError, setAbsentError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);

  useEffect(() => {
    if (!absentParams) return;
    let cancelled = false;
    setAbsentLoading(true);
    setAbsentError(null);
    attendanceService
      .getAbsentStudents(absentParams)
      .then((res) => {
        if (!cancelled) setAbsentData(res.data?.data ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setAbsentError(extractErrorMessage(err, "Failed to load absent students."));
          setAbsentData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setAbsentLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absentParams, reloadKey]);

  useEffect(() => {
    if (!rangeValid) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    attendanceService
      .getAnalytics(params)
      .then((res) => {
        if (!cancelled) setData(res.data?.data ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(extractErrorMessage(err, "Failed to load attendance analytics."));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, rangeValid, reloadKey]);

  const refresh = useCallback(() => {
    if (rangeValid) setReloadKey((k) => k + 1);
  }, [rangeValid]);

  // ── Derived view model ────────────────────────────────────────────────────
  const totals = data?.totals;
  const byClass = useMemo(() => (data ? aggregateItems(data.buckets, "byClass") : []), [data]);
  const bySubject = useMemo(() => (data ? aggregateItems(data.buckets, "bySubject") : []), [data]);
  const isEmpty = !data || data.buckets.length === 0 || totals?.sessions === 0;
  const classroomName = classrooms.find((c) => c.id === classroomId)?.name ?? "";
  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";

  return (
    <div className="lg:py-1 lg:px-2 font-poppins">
      <div className="border border-border/40 overflow-hidden bg-background/75 backdrop-blur-sm">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-30 bg-chestnut">
          <div className="flex items-center gap-2.5 min-w-0">
            <Menu className="lg:hidden text-white" onClick={openMobileNav} />
            <BarChart3 className="w-5 h-5 hidden lg:inline text-white" />
            <span className="text-white font-semibold text-sm truncate">Attendance Analytics</span>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/25 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* ── Filters ── */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-forestBlue-light" />
              <h3 className="text-sm font-semibold text-foreground">Report filters</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  title={p.hint}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    period === p.value
                      ? "border-chestnut/60 bg-chestnut/[0.06] text-chestnut ring-1 ring-chestnut/30"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {period === 0 && (
                <Field label="Day">
                  <DatePicker value={dailyDate} max={today} onChange={setDailyDate} className={inputCls} />
                </Field>
              )}
              {period === 1 && (
                <Field label="Week containing">
                  <DatePicker value={weekDate} max={today} onChange={setWeekDate} className={inputCls} />
                </Field>
              )}
              {period === 2 && (
                <Field label="Month">
                  <input
                    type="month"
                    value={month}
                    max={today.slice(0, 7)}
                    onChange={(e) => setMonth(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              )}
              {period === 3 && (
                <>
                  <Field label="From month">
                    <input
                      type="month"
                      value={fromMonth}
                      max={today.slice(0, 7)}
                      onChange={(e) => setFromMonth(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="To month">
                    <input
                      type="month"
                      value={toMonth}
                      max={today.slice(0, 7)}
                      onChange={(e) => setToMonth(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </>
              )}

              <Field label="Attendance type">
                <Select value={attType || "__all"} onValueChange={(v) => setAttType(v === "__all" ? "" : v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value || "__all"}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Class (optional)">
                <Select
                  value={classroomId || "__all"}
                  onValueChange={(v) => {
                    setClassroomId(v === "__all" ? "" : v);
                    setSubjectId("");
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All classes</SelectItem>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Subject (optional)">
                <Select
                  value={subjectId || "__all"}
                  onValueChange={(v) => setSubjectId(v === "__all" ? "" : v)}
                  disabled={!classroomId}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All subjects</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {!rangeValid && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                The “From month” must be on or before the “To month”.
              </p>
            )}
          </section>

          {/* ── Error ── */}
          {error && <ErrorBanner message={error} />}

          {/* ── Loading ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
              <Loader2 className="h-6 w-6 animate-spin text-forestBlue-light" />
              <p className="mt-3 text-sm text-muted-foreground">Loading attendance analytics…</p>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && !error && isEmpty && <EmptyState />}

          {/* ── Results ── */}
          {!loading && !error && data && !isEmpty && (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>
                  Showing <span className="font-semibold text-foreground">{data.periodLabel}</span>
                </span>
                {classroomName && (
                  <span>
                    · class <b className="text-foreground">{classroomName}</b>
                  </span>
                )}
                {subjectName && (
                  <span>
                    · subject <b className="text-foreground">{subjectName}</b>
                  </span>
                )}
              </div>

              {/* ── KPI cards ── */}
              <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <Kpi icon={<CalendarDays className="h-4 w-4" />} label="Sessions" value={totals!.sessions} />
                <Kpi
                  icon={<Users className="h-4 w-4" />}
                  label="Expected roster"
                  value={totals!.expected}
                  hint="Enrolled students summed per session"
                />
                <Kpi
                  icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
                  label="Present"
                  value={totals!.present}
                  valueClass="text-emerald-600"
                />
                <Kpi
                  icon={<UserX className="h-4 w-4 text-rose-500" />}
                  label="Not in school"
                  value={totals!.absent}
                  valueClass="text-rose-500"
                  hint="Absent = expected − present"
                />
                <Kpi
                  icon={<TrendingUp className="h-4 w-4 text-forestBlue-light" />}
                  label="Attendance rate"
                  value={`${round1(totals!.attendanceRate)}%`}
                  valueClass="text-forestBlue-light"
                />
              </section>

              {/* ── In school vs not in school ── */}
              <PresentAbsentBar present={totals!.present} absent={totals!.absent} />

              {/* ── Trend (multi-bucket periods) ── */}
              {data.buckets.length > 1 && (
                <section className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground">Attendance trend</h3>
                  <p className="mb-3 text-[11px] text-muted-foreground">Attendance rate per period</p>
                  <TrendBars buckets={data.buckets} />
                </section>
              )}

              {/* ── By class / by subject ── */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <School className="h-4 w-4 text-forestBlue-light" />
                    <h3 className="text-sm font-semibold text-foreground">By Class</h3>
                    <span className="ml-auto text-[11px] text-muted-foreground">{byClass.length} classes</span>
                  </div>
                  <RateBarList
                    items={byClass}
                    fill="var(--color-forestBlue-light)"
                    emptyText="No class-level attendance captured for this period."
                  />
                </section>

                <section className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-forestBlue-strong" />
                    <h3 className="text-sm font-semibold text-foreground">By Subject</h3>
                    <span className="ml-auto text-[11px] text-muted-foreground">{bySubject.length} subjects</span>
                  </div>
                  <RateBarList
                    items={bySubject}
                    fill="var(--color-forestBlue-strong)"
                    emptyText="No subject-level attendance captured for this period."
                  />
                </section>
              </div>

              {/* ── Students not in school ── */}
              <section className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <UserX className="h-4 w-4 text-rose-500" />
                  <h3 className="text-sm font-semibold text-foreground">Students not in school</h3>
                  {absentData && (
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {absentData.students.length} of {absentData.totalStudents} students ·{" "}
                      {absentData.periodLabel}
                    </span>
                  )}
                </div>

                {!absentScope ? (
                  <p className="rounded-lg border border-dashed border-border bg-muted px-4 py-8 text-center text-xs text-muted-foreground">
                    Select a specific class or subject in the filters above to see which students were absent.
                  </p>
                ) : absentLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-forestBlue-light" />
                    <p className="text-xs text-muted-foreground">Loading absent students…</p>
                  </div>
                ) : absentError ? (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs text-red-600/80 dark:text-red-400/80">{absentError}</p>
                  </div>
                ) : !absentData || absentData.students.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-medium text-muted-foreground">All students attended</p>
                    <p className="text-xs text-muted-foreground">
                      No absences recorded for {absentData?.classroomName ?? absentData?.subjectName} in this period.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {absentData.students.map((s) => (
                      <button
                        key={s.studentId}
                        type="button"
                        onClick={() =>
                          setSelectedStudent({ studentId: s.studentId, studentName: s.studentName })
                        }
                        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-forestBlue-light/40 hover:bg-forestBlue-light/[0.04]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{s.studentName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.sessions} sessions · present {s.presentCount}/{s.sessions}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                          absent {s.absentCount}
                        </span>
                        <span className="w-10 shrink-0 text-right text-xs font-bold text-foreground">
                          {s.attendanceRate}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Period breakdown (monthly range) ── */}
              {data.buckets.length > 1 && (
                <section className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Period breakdown</h3>
                  <MonthlyTable buckets={data.buckets} />
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <StudentStatsModal
        open={!!selectedStudent}
        studentId={selectedStudent?.studentId ?? ""}
        studentName={selectedStudent?.studentName ?? ""}
        attendanceType={absentScope?.attendanceType ?? 0}
        classroomId={absentScope?.classroomId}
        subjectId={absentScope?.subjectId}
        periodParams={absentParams ?? { period }}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
};

export default AttendanceAnalytics;
