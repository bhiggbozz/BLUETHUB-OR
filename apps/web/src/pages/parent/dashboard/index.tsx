import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { CalendarCheck2, CheckCircle2, ChevronRight, GraduationCap, Loader2, Users, XCircle } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useParentChildren } from "@/contexts/parent-children-context";
import { attendanceService, type AttendanceHistoryItem } from "@/services/attendance";
import CalendarTermDashboardCard from "@/pages/calendar/components/calendar-term-dashboard-card";

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const {
    children: childList,
    loading: childrenLoading,
    error: childrenError,
    selectedChildId,
    setSelectedChildId,
    selectedChild,
  } = useParentChildren();

  const [history, setHistory] = useState<AttendanceHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChildId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    attendanceService
      .getStudentAttendance(selectedChildId)
      .then((res) => {
        if (!cancelled) setHistory(res.data?.data ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof AxiosError
            ? err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message
            : (err as Error).message;
        setHistoryError(msg || "Failed to load recent activity.");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChildId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6">
        <h1 className="text-lg sm:text-2xl font-bold text-[#12122A]">
          Welcome, {user?.firstName ?? "there"}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Keep track of your {childList.length === 1 ? "child's" : "children's"} attendance at a glance.
        </p>
      </div>

      <CalendarTermDashboardCard />

      {childrenLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading your children...</span>
        </div>
      ) : childrenError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-red-600 font-medium">{childrenError}</p>
        </div>
      ) : childList.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600">No children linked to your account yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Contact your school administrator to have your child's record linked to this account.
          </p>
        </div>
      ) : (
        <>
          {/* Child switcher */}
          {childList.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {childList.map((c) => {
                const active = c.studentId === selectedChildId;
                return (
                  <button
                    key={c.studentId}
                    type="button"
                    onClick={() => setSelectedChildId(c.studentId)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                      active
                        ? "bg-chestnut text-white border-chestnut"
                        : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    {c.firstName} {c.lastName}
                  </button>
                );
              })}
            </div>
          )}

          {selectedChild && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-chestnut to-chestnut/70 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {selectedChild.firstName?.[0]}
                    {selectedChild.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#12122A] truncate">
                      {selectedChild.firstName} {selectedChild.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{selectedChild.classroomName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/parent/attendance")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-chestnut/10 text-chestnut text-xs font-semibold hover:bg-chestnut/15 transition-colors shrink-0"
                >
                  <CalendarCheck2 className="w-3.5 h-3.5" />
                  View attendance
                </button>
              </div>

              {/* Recent activity */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#12122A]">Recent activity</h2>
                  <button
                    type="button"
                    onClick={() => navigate("/parent/attendance")}
                    className="text-xs font-semibold text-chestnut hover:opacity-70 flex items-center gap-0.5"
                  >
                    See all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {historyLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading recent activity...</span>
                  </div>
                ) : historyError ? (
                  <div className="p-5 text-center">
                    <p className="text-sm text-red-600">{historyError}</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-400">No attendance recorded yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {history.slice(0, 8).map((item) => (
                      <div key={item.sessionId} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#12122A] truncate">
                            {item.subjectName || item.subTopicName || item.classroomName || item.attendanceTypeName}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {item.classroomName ? `${item.classroomName} · ` : ""}
                            {item.startedAt ? new Date(item.startedAt).toLocaleString() : ""}
                          </p>
                        </div>
                        {item.isPresent ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Present
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 shrink-0">
                            <XCircle className="w-3.5 h-3.5" /> Absent
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ParentDashboard;
