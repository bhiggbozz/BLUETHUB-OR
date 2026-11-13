import { useEffect, useState } from "react";
import { performanceService, type TeacherActivityDto } from "@/services/performance";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@bluethub/ui-kit";

// const trustBadge = (level: string) => {
//   switch (level.toLowerCase()) {
//     case "excellent": return "bg-green-100 text-green-700";
//     case "good": return "bg-blue-100 text-blue-700";
//     case "average": return "bg-amber-100 text-amber-700";
//     case "poor": return "bg-red-100 text-red-700";
//     default: return "bg-slate-100 text-slate-600";
//   }
// };

export function TeacherActivity() {
  const [teachers, setTeachers] = useState<TeacherActivityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const res = await performanceService.getAdminDashboard();
        const d = res.data?.data;
        if (!cancelled && d) setTeachers(d.teacherActivities ?? []);
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

  if (teachers.length === 0) return null;

  const displayTeachers = expanded ? teachers : teachers.slice(0, 5);

 return (
    <div className="bg-card rounded-md border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Teacher Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Lesson creation and trust scores</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-5 px-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[480px] overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="min-w-[90px] text-foreground">Teacher</TableHead>
                <TableHead className="text-center text-foreground">Created</TableHead>
                <TableHead className="text-center text-foreground">Published</TableHead>
                <TableHead className="text-center text-foreground">Draft</TableHead>
                <TableHead className="text-center text-foreground">Pending</TableHead>
                <TableHead className="text-center text-foreground">Rejected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTeachers.map((t, i) => (
                <TableRow key={t.teacherId} className={i % 2 === 1 ? "bg-muted/25" : undefined}>
                  <TableCell className="font-medium text-foreground whitespace-nowrap">
                    {t.teacherName}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{t.totalLessonsCreated}</TableCell>
                  <TableCell className="text-center font-medium text-emerald-600 dark:text-emerald-400">
                    {t.publishedLessons}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{t.draftLessons}</TableCell>
                  <TableCell className="text-center text-amber-600 dark:text-amber-400">
                    {t.pendingApprovalLessons}
                  </TableCell>
                  <TableCell className="text-center">
                    {t.rejectedLessons > 0 ? (
                      <span className="text-rose-500 dark:text-rose-400 font-medium">{t.rejectedLessons}</span>
                    ) : (
                      <span className="text-muted-foreground">{t.rejectedLessons}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {teachers.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-xs font-medium text-chestnut hover:underline"
        >
          {expanded ? "Show less" : `Show all (${teachers.length})`}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}
