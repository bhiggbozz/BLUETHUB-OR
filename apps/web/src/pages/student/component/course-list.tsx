import { isStudentRoleData, useAuthContext } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import {
  BookOpen, FlaskConical, Calculator, Globe, Music,
  Palette, Dumbbell, Code, BookMarked, Microscope,
} from "lucide-react";
import { useNavigate } from "react-router-dom";


interface ISubject {
  subjectId: string,
  subjectName: string,
  subjectCategory: string
}

const CourseList = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate()
  const [subject, setSubject] = useState<ISubject[]>()

  useEffect(() => {
    const roleData = user?.roleData
    if (!roleData) return
    if (!isStudentRoleData(roleData)) return
    const student = roleData
    const mergedSubject = [
      ...(student.majorSubjects ?? []),
      ...(student.minorSubjects ?? []),
    ]
    setSubject(mergedSubject)
  }, [user])




  // ── Map subject category/name → icon ──────────────────────
  function getSubjectIcon(name: string, category: string) {
    const key = (category || name).toLowerCase();
    if (key.includes("math")) return Calculator;
    if (key.includes("science") || key.includes("bio")) return Microscope;
    if (key.includes("chem") || key.includes("lab")) return FlaskConical;
    if (key.includes("english") || key.includes("lit")) return BookOpen;
    if (key.includes("history") || key.includes("geo")) return Globe;
    if (key.includes("music")) return Music;
    if (key.includes("art") || key.includes("creative")) return Palette;
    if (key.includes("sport") || key.includes("pe")) return Dumbbell;
    if (key.includes("tech") || key.includes("comput")) return Code;
    return BookMarked; // default
  }

  // ── Initials avatar fallback ──────────────────────────────
  function getInitials(name: string) {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }

  const ICON_COLORS = [
    "bg-violet-50 text-violet-500 ring-violet-100",
    "bg-blue-50   text-blue-500   ring-blue-100",
    "bg-emerald-50 text-emerald-500 ring-emerald-100",
    "bg-amber-50  text-amber-500  ring-amber-100",
    "bg-rose-50   text-rose-500   ring-rose-100",
    "bg-cyan-50   text-cyan-500   ring-cyan-100",
  ];

  function getIconColor(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
  }

  // function to get gradient color based on progress %
  // const getProgressColor = (progress: number) => {
  //   if (progress <= 40) return { start: "#EF4444", end: "#FCA5A5" }; // red
  //   if (progress <= 70) return { start: "#FBBF24", end: "#FDE68A" }; // yellow
  //   return { start: "#4F61E8", end: "#B8CBF8" }; // green
  // };

  return (
    <div className="space-y-2 font-poppins">
      {subject?.slice(0, 3).map((course: ISubject) => {
        const SubjectIcon = getSubjectIcon(course.subjectName, course.subjectCategory);
        const iconColor = getIconColor(course.subjectId);

        return (
          <div
            key={course.subjectId}
            onClick={() => navigate(`my-course/${course.subjectId}`)}
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-[#f3f6ff]/95 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-24px_rgba(79,97,232,0.5)]"
          >
            {/* Icon */}
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${iconColor}`}>
              <SubjectIcon className="h-5 w-5" />
            </div>

            {/* Name + category */}
            <div className="flex-1 min-w-0">
              <h3 className="font-poppins text-[13px] font-semibold text-slate-900 truncate">
                {course.subjectName}
              </h3>
              {course.subjectCategory && (
                <p className="font-poppins text-[10.5px] text-slate-400 mt-0.5 truncate">
                  {course.subjectCategory === "1" ? "major subject" : "minor subject"}
                </p>
              )}
            </div>

            {/* Initials badge */}
            <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ring-1 ${iconColor}`}>
              {getInitials(course.subjectName)}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {(!subject || subject.length === 0) && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <BookMarked className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-[13px] font-medium text-slate-400">No subjects assigned</p>
          <p className="text-[11px] text-slate-300 mt-0.5">Subjects will appear here once assigned</p>
        </div>
      )}
    </div>
  );
};


export default CourseList;
