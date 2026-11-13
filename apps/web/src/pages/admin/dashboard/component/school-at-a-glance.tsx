import { useEffect, useState } from "react";
import { performanceService, type AdminDashboardOverviewDto } from "@/services/performance";
import {
  Loader2,
  GraduationCap,
  Users,
  School,
  BookOpen,
  FileText,
  CheckCircle2,
  Target,
  TrendingUp,
  Eye,
} from "lucide-react";

export function SchoolAtAGlance() {
  const [overview, setOverview] = useState<AdminDashboardOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const res = await performanceService.getAdminDashboard();
        const d = res.data?.data;
        if (!cancelled && d) setOverview(d.overview);
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

  if (!overview) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const glanceData = [
    { label: "Total students", value: overview.totalStudents, icon: GraduationCap },
    { label: "Total teachers", value: overview.totalTeachers, icon: Users },
    { label: "Active classes", value: overview.totalClassrooms, icon: School },
    { label: "Total subjects", value: overview.totalSubjects, icon: BookOpen },
    { label: "Lessons created", value: overview.totalLessonsCreated, icon: FileText },
    { label: "Lessons published", value: overview.totalLessonsPublished, icon: CheckCircle2, accent: true },
    { label: "Avg score", value: `${overview.overallAverageScore.toFixed(1)}%`, icon: Target },
    { label: "Pass rate", value: `${overview.overallPassRate.toFixed(1)}%`, icon: TrendingUp, accent: true },
    { label: "Lesson watches", value: overview.totalLessonWatches, icon: Eye },
  ];

  return (
    <div className="bg-card rounded-md border border-border p-5">
      <p className="text-sm font-medium text-foreground mb-4">School at a glance</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {glanceData.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-lg border border-border/60 p-2.5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent
                  ? "bg-gradient-to-br from-chestnut to-forestBlue-light shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_2px_6px_-2px_rgba(41,35,130,0.45)]"
                  : "bg-chestnut/10"
                }`}
            >
              <Icon className={accent ? "text-white" : "text-chestnut"} size={15} />
            </div>
            <div className="min-w-0">
              <p
                className={`text-sm font-bold leading-none truncate ${accent ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                  }`}
              >
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
