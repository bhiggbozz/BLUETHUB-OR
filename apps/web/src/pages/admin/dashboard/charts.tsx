import { useEffect, useState } from "react";
import { performanceService, type SubjectPerformanceDto } from "@/services/performance";
import { Loader2 } from "lucide-react";

const barColors = [
  "bg-chestnut",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
];

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

  const maxScore = Math.max(...subjects.map((s) => s.averageScorePercent), 1);

  return (
    <section className="font-poppins space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Subject performance — takes 5/5 */}
        <div className="md:col-span-5 bg-white rounded-md p-4 shadow-sm border border-gray-100">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-900">Subject Performance</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Average scores this term</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : subjects.length === 0 ? (
            <p className="text-xs text-slate-400">No subject performance data available.</p>
          ) : (
            <div className="space-y-3.5">
              {subjects.map((s, i) => (
                <div key={s.subjectId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 font-medium">{s.subjectName}</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {s.averageScorePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${barColors[i % barColors.length]} transition-all duration-500`}
                      style={{ width: `${(s.averageScorePercent / maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


    </section>
  );
};

export default Charts;
