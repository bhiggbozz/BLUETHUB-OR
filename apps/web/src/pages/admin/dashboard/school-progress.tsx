import { useEffect, useState } from "react";
import { performanceService, type AdminDashboardOverviewDto } from "@/services/performance";
import { Users, GraduationCap, BookOpen, School, Video, Loader2 } from "lucide-react";

const statConfig = [
  { key: "totalStudents", label: "Total Students", icon: GraduationCap, bg: "bg-blue-50", iconColor: "text-blue-600" },
  { key: "totalTeachers", label: "Total Teachers", icon: Users, bg: "bg-chestnut/10", iconColor: "text-chestnut" },
  { key: "totalClassrooms", label: "Active Classes", icon: School, bg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { key: "totalSubjects", label: "Subjects", icon: BookOpen, bg: "bg-violet-50", iconColor: "text-violet-600" },
  { key: "totalLessonsPublished", label: "Published Lessons", icon: Video, bg: "bg-amber-50", iconColor: "text-amber-600" },
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
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </section>
    );
  }

  if (!overview) {
    return (
      <section className="flex items-center justify-center py-6 text-xs text-slate-400">
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
              className="bg-white rounded-md p-3 shadow-sm border border-gray-100 flex flex-col gap-2"
            >
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <Icon className={stat.iconColor} size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-none">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SchoolProgress;
