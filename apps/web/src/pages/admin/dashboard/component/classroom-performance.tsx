import { useEffect, useState } from "react";
import { performanceService, type ClassroomPerformanceDto } from "@/services/performance";
import { ChevronDown, ChevronUp, Loader2, Building2 } from "lucide-react";

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
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (classrooms.length === 0) return null;

  const display = expanded ? classrooms : classrooms.slice(0, 5);

  return (
    <div className="bg-white rounded-md border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-gray-900">Classroom Performance</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-gray-100">
              <th className="pb-2 font-semibold">Classroom</th>
              <th className="pb-2 font-semibold">Students</th>
              <th className="pb-2 font-semibold">Avg Score</th>
              <th className="pb-2 font-semibold">Pass Rate</th>
              <th className="pb-2 font-semibold">Attempts</th>
              <th className="pb-2 font-semibold">Completed</th>
              <th className="pb-2 font-semibold">Lesson Watches</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {display.map((c) => (
              <tr key={c.classroomId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-2.5 pr-3 font-medium text-slate-800">{c.classroomName}</td>
                <td className="py-2.5 pr-3">{c.studentCount}</td>
                <td className="py-2.5 pr-3">{c.averageScorePercent.toFixed(1)}%</td>
                <td className="py-2.5 pr-3">{c.passRate.toFixed(1)}%</td>
                <td className="py-2.5 pr-3">{c.totalAttempts}</td>
                <td className="py-2.5 pr-3">{c.completedAttempts}</td>
                <td className="py-2.5">{c.lessonWatchCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
