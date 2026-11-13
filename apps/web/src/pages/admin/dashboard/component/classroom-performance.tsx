import { useEffect, useState } from "react";
import { performanceService, type ClassroomPerformanceDto } from "@/services/performance";
import { ChevronDown, ChevronUp, Loader2, Building2 } from "lucide-react";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@bluethub/ui-kit";

/** Pass rate is a good/bad metric, not just "another column" — it wears
 * status tokens (dataviz: a series that means good/bad wears status, never
 * plain text) instead of sitting as flat gray text like the rest. */
function passRateBadge(passRate: number) {
  if (passRate >= 75) return <Badge variant="success">{passRate.toFixed(1)}%</Badge>;
  if (passRate >= 50) return <Badge variant="warning">{passRate.toFixed(1)}%</Badge>;
  return <Badge variant="destructive">{passRate.toFixed(1)}%</Badge>;
}

export function ClassroomPerformance() {
  const [classrooms, setClassrooms] = useState<ClassroomPerformanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const res = await performanceService.getAdminDashboard();
        const d = res.data?.data;
        if (!cancelled && d) setClassrooms(d.classroomPerformances ?? []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (classrooms.length === 0) return null;

  const display = expanded ? classrooms : classrooms.slice(0, 5);

  return (
    <div className="bg-card rounded-md border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Classroom Performance</h3>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px] overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="text-foreground">Classroom</TableHead>
                <TableHead className="text-foreground">Students</TableHead>
                <TableHead className="text-foreground">Avg Score</TableHead>
                <TableHead className="text-foreground">Pass Rate</TableHead>
                <TableHead className="text-foreground">Attempts</TableHead>
                <TableHead className="text-foreground">Completed</TableHead>
                <TableHead className="text-foreground">Lesson Watches</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {display.map((c, i) => (
                <TableRow key={c.classroomId} className={i % 2 === 1 ? "bg-muted/25" : undefined}>
                  <TableCell className="font-medium text-foreground">{c.classroomName}</TableCell>
                  <TableCell className="text-muted-foreground">{c.studentCount}</TableCell>
                  <TableCell className="text-muted-foreground">{c.averageScorePercent.toFixed(1)}%</TableCell>
                  <TableCell>{passRateBadge(c.passRate)}</TableCell>
                  <TableCell className="text-muted-foreground">{c.totalAttempts}</TableCell>
                  <TableCell className="text-muted-foreground">{c.completedAttempts}</TableCell>
                  <TableCell className="text-muted-foreground">{c.lessonWatchCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {classrooms.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-xs font-medium text-chestnut hover:underline"
        >
          {expanded ? "Show less" : `Show all (${classrooms.length})`}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}
