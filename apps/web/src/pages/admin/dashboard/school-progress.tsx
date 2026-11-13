import { useEffect, useState } from "react";
import { performanceService, type AdminDashboardOverviewDto } from "@/services/performance";
import { Users, GraduationCap, BookOpen, School, Video, Loader2 } from "lucide-react";

const statConfig = [
  { key: "totalStudents", label: "Total Students", icon: GraduationCap },
  { key: "totalTeachers", label: "Total Teachers", icon: Users },
  { key: "totalClassrooms", label: "Active Classes", icon: School },
  { key: "totalSubjects", label: "Subjects", icon: BookOpen },
  { key: "totalLessonsPublished", label: "Published Lessons", icon: Video },
];

const SchoolProgress = () => {
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
      <section className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </section>
    );
  }

  if (!overview) {
    return (
      <section className="flex items-center justify-center py-6 text-xs text-muted-foreground">
        Could not load dashboard data.
      </section>
    );
  }

  return (
    <section className="font-poppins">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {statConfig.map((stat) => {
          const Icon = stat.icon;
          const value = overview[stat.key as keyof AdminDashboardOverviewDto] ?? 0;
          return (
            <div
              key={stat.key}
              className="bg-card rounded-md p-3 shadow-sm border border-border flex flex-col gap-2 transition-shadow hover:shadow-md"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chestnut to-forestBlue-light shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_2px_6px_-2px_rgba(41,35,130,0.45)] flex items-center justify-center">
                <Icon className="text-white" size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-none">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SchoolProgress;
