import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentService, type StudentDashboardStats } from "@/services/student";
import { BookOpen, ClipboardCheck, GraduationCap, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import StudentLiveClassCard from "@/component/live-class/student-live-class-card";

const ExtracurricularActivity = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await studentService.getDashboardStats();
        if (res.data.status === "successful") {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        // Set fallback data for development/when API is not ready
        setStats({
          classesThisWeek: 0,
          quizzesThisWeek: 0,
          assessmentsThisWeek: 0,
          pendingAssignments: 0,
          hasLiveClass: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[16px] border border-white/80 bg-white/80 p-3 shadow-sm"
          >
            <div className="mb-2 h-8 w-8 rounded-xl bg-slate-200" />
            <div className="mb-1 h-5 w-10 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Classes",
      sublabel: "This week",
      value: stats?.classesThisWeek ?? 0,
      icon: Tv,
      color: "text-purple-600",
      bg: "bg-purple-50",
      iconBg: "bg-purple-100",
      onClick: () => navigate("/student/recorded-class"),
    },
    {
      label: "Quizzes",
      sublabel: "This week",
      value: stats?.quizzesThisWeek ?? 0,
      icon: GraduationCap,
      color: "text-blue-600",
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      onClick: () => navigate("/student/quizzes"),
    },
    {
      label: "Assessments",
      sublabel: "This week",
      value: stats?.assessmentsThisWeek ?? 0,
      icon: ClipboardCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      onClick: () => navigate("/student/assessments"),
    },
    {
      label: "Pending",
      sublabel: "Assignments",
      value: stats?.pendingAssignments ?? 0,
      icon: BookOpen,
      color: "text-amber-600",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
      highlight: (stats?.pendingAssignments ?? 0) > 0,
      onClick: () => navigate("/student/assignments"),
    },
  ];

  return (
    <div className="space-y-3 p-2 md:p-0">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={card.onClick}
              className={cn(
                "group relative overflow-hidden rounded-md border p-3 text-left transition-all duration-300",
                "border-white/80 bg-white/80 shadow-[0_26px_20px_-30px_rgba(53,70,160,0.45)]",
                card.highlight && "ring-2 ring-amber-200"
              )}
            >
              <div className={cn(
                "absolute inset-x-0 top-0 h-0.5 opacity-80",
                card.label === "Classes" && "bg-[#7d8eff]",
                card.label === "Quizzes" && "bg-[#76b7ff]",
                card.label === "Assessments" && "bg-[#6ee7b7]",
                card.label === "Pending" && "bg-[#fbbf24]"
              )} />

              <div className={cn(
                "mb-3 flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
                card.iconBg
              )}>
                <Icon className={cn("w-4 h-4", card.color)} />
              </div>

              <p className={cn(
                "text-2xl font-semibold tracking-tight",
                card.value > 0 ? "text-slate-900" : "text-slate-400"
              )}>
                {card.value}
              </p>

              <p className="mt-2 text-xs font-semibold leading-tight text-slate-800">
                {card.label}
              </p>
              <p className="text-[10px] text-slate-500">
                {card.sublabel}
              </p>

              <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                Open panel
              </p>

              {card.highlight && card.value > 0 && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      <StudentLiveClassCard />
    </div>
  );
};

export default ExtracurricularActivity;
