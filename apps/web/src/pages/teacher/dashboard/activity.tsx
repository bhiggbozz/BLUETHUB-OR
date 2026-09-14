import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  Plus,
  Users,
  BookOpen,
  GraduationCap,
  LibraryBig,
  BarChart2,
  TrendingUp,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
// import { teacherService, type TeacherDashboardStats } from "@/services/teacher";
import { performanceService, type ClassTeacherNavbarDto, type SubjectTeacherNavbarDto } from "@/services/performance";
import { useAuthContext } from "@/contexts/auth-context";


type TeacherNavbarDto = SubjectTeacherNavbarDto | ClassTeacherNavbarDto;


const quickActions = [
  { label: "Submit lesson", description: "Send to admin for review", icon: <Plus className="text-chestnut size-4" />, path: "/teacher/submit-lesson" },
  { label: "New assessment", description: "Create & assign to class", icon: <ClipboardList className="text-chestnut size-4" />, path: "/teacher/assessment" },
  { label: "Question Bank", description: "Scan & manage questions", icon: <BookOpen className="text-chestnut size-4" />, path: "/teacher/question-bank" },
  { label: "My Lessons", description: "View submitted lessons", icon: <CalendarDays className="text-chestnut size-4" />, path: "/teacher/my-lessons" },
];

const Activity = () => {
  const navigate  = useNavigate();
  const { user }  = useAuthContext();
  const role      = user?.roleName;

  const [stats,   setStats]   = useState<TeacherNavbarDto | null>(null);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await performanceService.getNavbar();
        if (res.data.status === 'failed') return;
        setStats(res.data.data as TeacherNavbarDto);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cardData = [
    {
      label: "Total Students",
      count: stats?.totalStudents ?? 0,
      change: "Across all classes",
      icon: <Users className="text-chestnut" />,
    },
    {
      label: "Active Classes",
      count: (stats as SubjectTeacherNavbarDto)?.classCount ?? 0,
      change: "Assigned to you",
      icon: <GraduationCap className="text-chestnut" />,
    },
    // only SubjectTeacher has subjectCount
    ...(role === "SubjectTeacher" ? [{
      label: "Subjects",
      count: (stats as SubjectTeacherNavbarDto)?.subjectCount ?? 0,
      change: "Currently teaching",
      icon: <LibraryBig className="text-chestnut" />,
    }] : []),
    {
      label: "Avg Score",
      count: `${((stats as SubjectTeacherNavbarDto)?.overallAverageScore ?? 0).toFixed(1)}%`,
      change: "Class average",
      icon: <BarChart2 className="text-chestnut" />,
    },
    {
      label: "Pass Rate",
      count: `${((stats as SubjectTeacherNavbarDto)?.overallPassRate ?? 0).toFixed(1)}%`,
      change: "Students passing",
      icon: <TrendingUp className="text-chestnut" />,
    },
    {
      label: "Pending Grading",
      count: stats?.pendingGradingItems ?? 0,
      change: "Awaiting grades",
      icon: <ClipboardCheck className="text-chestnut" />,
    },
    {
      label: "Lessons This Week",
      count: stats?.lessonsThisWeek ?? 0,
      change: "Recorded classes",
      icon: <BookOpen className="text-chestnut" />,
    },
    {
      label: "Pending Approvals",
      count: stats?.pendingApprovals ?? 0,
      change: "Awaiting review",
      icon: <ClipboardList className="text-chestnut" />,
    },
    {
      label: "Today's Classes",
      count: stats?.classesToday ?? 0,
      change: "Scheduled today",
      icon: <CalendarDays className="text-chestnut" />,
    },
  ];

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollButtons(); // check immediately in case content already overflows
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [loading, cardData.length]); // re-check once loading finishes and cards are in the DOM

  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="w-full space-y-2">
        <div className="flex gap-3 overflow-x-auto py-2 px-1">
          {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[11px] border border-[#D9D9D9] px-4 py-3 min-w-48 max-w-48 shrink-0 animate-pulse"
          >
            <div className="h-8 w-8 bg-gray-200 rounded-[8px]" />
            <div className="h-7 bg-gray-200 rounded w-14 mt-2" />
            <div className="h-3 bg-gray-100 rounded w-20 mt-1.5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount("left")}
            aria-label="Scroll left"
            className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-white border border-[#D9D9D9] shadow-md flex items-center justify-center hover:bg-gray-50 transition"
          >
            <ChevronLeft className="size-4 text-[#3A3A3A]" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden scrollbar-none snap-x snap-mandatory scroll-smooth py-1 px-0"
        >
          {cardData.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-[11px] border border-[#D9D9D9] px-4 py-3 md:min-w-[190px] md:max-w-[190px] snap-start shrink-0 transition hover:shadow-md"
            >
              <div className="h-8 w-8 bg-[#EEF1FB] rounded-[8px] flex items-center justify-center">
                {card.icon}
              </div>
              <h4 className="font-semibold text-2xl leading-tight text-[#0F0F0E] pt-2">
                {card.count}
              </h4>
              <h3 className="font-normal text-[11px] text-[#3A3A3A80] capitalize pt-0.5">
                {card.label}
              </h3>
              <p className="text-chestnut font-normal text-xs pt-0.5">{card.change}</p>
            </div>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount("right")}
            aria-label="Scroll right"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-white border border-[#D9D9D9] shadow-md flex items-center justify-center hover:bg-gray-50 transition"
          >
            <ChevronRight className="size-4 text-[#3A3A3A]" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {quickActions.map((action) => (
          <div
            key={action.label}
            onClick={() => navigate(action.path)}
            className="group border border-[#E8E8E3] p-1.5 md:py-2.5 md:px-3 rounded-[10px] bg-white flex items-center gap-2 cursor-pointer transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-r from-chestnut/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="bg-[#EEF1FB] size-7 md:size-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-chestnut/10 transition-all duration-300">
              {action.icon}
            </div>

            <div className="space-y-0 relative">
              <h3 className="text-[#0F0F0E] font-medium text-[11px] group-hover:text-chestnut transition-colors duration-300">
                {action.label}
              </h3>
              <p className="text-[#A8A8A4] text-[10px] font-normal leading-tight">
                {action.description}
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-chestnut/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Activity;