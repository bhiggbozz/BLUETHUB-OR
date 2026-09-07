import { useEffect, useState } from "react";
import { performanceService, type AdminDashboardOverviewDto } from "@/services/performance";
import { Loader2 } from "lucide-react";

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
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm text-slate-400">No data available</p>
      </div>
    );
  }

  const glanceData = [
    { label: "Total students", value: overview.totalStudents, color: "text-gray-900" },
    { label: "Total teachers", value: overview.totalTeachers, color: "text-gray-900" },
    { label: "Active classes", value: overview.totalClassrooms, color: "text-gray-900" },
    { label: "Total subjects", value: overview.totalSubjects, color: "text-gray-900" },
    { label: "Lessons created", value: overview.totalLessonsCreated, color: "text-gray-900" },
    { label: "Lessons published", value: overview.totalLessonsPublished, color: "text-green-600" },
    { label: "Avg score", value: `${overview.overallAverageScore.toFixed(1)}%`, color: "text-gray-900" },
    { label: "Pass rate", value: `${overview.overallPassRate.toFixed(1)}%`, color: "text-green-600" },
    { label: "Lesson watches", value: overview.totalLessonWatches, color: "text-gray-900" },
  ];

  return (
    <div className="bg-white rounded-md border border-gray-100 p-5">
      <p className="text-sm font-medium text-gray-900 mb-4">School at a glance</p>
      <div className="divide-y divide-gray-100">
        {glanceData.map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center py-2.5">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-sm font-semibold ${color}`}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
