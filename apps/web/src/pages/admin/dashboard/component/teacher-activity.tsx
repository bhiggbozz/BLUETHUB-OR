import { useEffect, useState } from "react";
import { performanceService, type TeacherActivityDto } from "@/services/performance";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const trustBadge = (level: string) => {
  switch (level.toLowerCase()) {
    case "excellent": return "bg-green-100 text-green-700";
    case "good": return "bg-blue-100 text-blue-700";
    case "average": return "bg-amber-100 text-amber-700";
    case "poor": return "bg-red-100 text-red-700";
    default: return "bg-slate-100 text-slate-600";
  }
};

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
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (teachers.length === 0) return null;

  const displayTeachers = expanded ? teachers : teachers.slice(0, 5);

 return (
    <div className="bg-white rounded-md border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Teacher Activity</h3>
          <p className="text-xs text-gray-400 mt-0.5">Lesson creation and trust scores</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-5 px-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full text-left text-xs min-w-[480px]">
          <thead>
            <tr className="text-slate-400 border-b border-gray-100">
              <th className="pb-2.5 font-semibold whitespace-nowrap pr-4 min-w-[90px]">Teacher</th>
              <th className="pb-2.5 font-semibold whitespace-nowrap pr-3 text-center">Created</th>
              <th className="pb-2.5 font-semibold whitespace-nowrap pr-3 text-center">Published</th>
              <th className="pb-2.5 font-semibold whitespace-nowrap pr-3 text-center">Draft</th>
              <th className="pb-2.5 font-semibold whitespace-nowrap pr-3 text-center">Pending</th>
              <th className="pb-2.5 font-semibold whitespace-nowrap pr-3 text-center">Rejected</th>
              <th className="pb-2.5 font-semibold whitespace-nowrap text-center">Trust</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {displayTeachers.map((t) => (
              <tr
                key={t.teacherId}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-3 pr-4 font-medium text-slate-800 whitespace-nowrap">
                  {t.teacherName}
                </td>
                <td className="py-3 pr-3 text-center">{t.totalLessonsCreated}</td>
                <td className="py-3 pr-3 text-center text-green-600 font-medium">
                  {t.publishedLessons}
                </td>
                <td className="py-3 pr-3 text-center">{t.draftLessons}</td>
                <td className="py-3 pr-3 text-center text-amber-600">
                  {t.pendingApprovalLessons}
                </td>
                <td className="py-3 pr-3 text-center">
                  {t.rejectedLessons > 0 ? (
                    <span className="text-red-500 font-medium">{t.rejectedLessons}</span>
                  ) : (
                    <span className="text-slate-400">{t.rejectedLessons}</span>
                  )}
                </td>
                <td className="py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${trustBadge(t.trustLevel)}`}>
                    {t.trustScore.toFixed(0)}% · {t.trustLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
