import { Input } from "@bluethub/ui-kit"
import { Link } from "react-router-dom";
import { performanceService, type MyCourseListItemDto } from "@/services/performance";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BookX, Loader2 } from "lucide-react";

const subjectStyles: Record<string, { icon: string; bg: string; badgeBg: string; badgeText: string }> = {
  mathematics: { icon: "📐", bg: "#EEF0FF", badgeBg: "#EEF0FF", badgeText: "#4F61E8" },
  "basic science": { icon: "🔬", bg: "#E8FAF0", badgeBg: "#E8FAF0", badgeText: "#22A56F" },
  english: { icon: "📖", bg: "#FDEBED", badgeBg: "#FDEBED", badgeText: "#E85D75" },
  geography: { icon: "🌍", bg: "#FFF6E5", badgeBg: "#FFF6E5", badgeText: "#D99800" },
  economics: { icon: "📊", bg: "#E8FAF0", badgeBg: "#E8FAF0", badgeText: "#22A56F" },
  business: { icon: "💼", bg: "#FFF6E5", badgeBg: "#FFF6E5", badgeText: "#D99800" },
  french: { icon: "🇫🇷", bg: "#E8FAF0", badgeBg: "#E8FAF0", badgeText: "#22A56F" },
  yoruba: { icon: "🌍", bg: "#FFF6E5", badgeBg: "#FFF6E5", badgeText: "#D99800" },
};

const defaultStyle = { icon: "📚", bg: "#F0F2FA", badgeBg: "#F0F2FA", badgeText: "#6B6B85" };

export function getSubjectStyle(name: string) {
  const key = Object.keys(subjectStyles).find(k => name.toLowerCase().includes(k));
  return key ? subjectStyles[key] : defaultStyle;
}

const Course = () => {
  const [subjects, setSubjects] = useState<MyCourseListItemDto[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    performanceService
      .getMyCourses()
      .then((res) => {
        if (cancelled) return;
        setSubjects(res.data?.data ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load my courses", err);
        setLoadError("Couldn't load your subjects. Please try again.");
        toast.error("Couldn't load your subjects. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = subjects.filter(s =>
    s.subjectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pt-[13px] px-2 lg:px-0 font-Poppins">
      <div className="space-y-[3px]">
        <h2 className="text-[#3A3A3A] font-medium text-xs leading-5">
          Choose a Subject
        </h2>
        <h4 className="text-[#6B6B85] font-medium text-xs leading-5">
          Select a subject to see your quiz and assessment performance
        </h4>
      </div>

      <div className="mt-3.75 mb-5">
        <Input
          className="rounded-[10px] border border-[#6B6B8580] bg-white leading-5 text-[#6B6B85] text-sm"
          placeholder="Search subjects....."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-[7px]">
          <h2 className="text-[#6B6B85] font-semibold text-xs leading-[0.8px] capitalize inline">
            All Subjects
          </h2>{" "}
          <h4 className="bg-[#4F61E81A] inline rounded-[15px] px-[10px] py-[4px] text-[#4F61E8] font-medium uppercase text-[10px]">
            {subjects.length}
          </h4>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B6B85]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-xs">Loading your subjects...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <BookX className="w-8 h-8 text-[#6B6B85]/40" />
            <p className="text-sm font-medium text-[#3A3A3A]">
              {loadError || "No subjects registered for this student yet."}
            </p>
            <p className="text-xs text-[#6B6B85]">
              Ask your school admin to confirm your class and subject assignment.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-[#6B6B85]">
            No subjects match "{search}".
          </p>
        ) : (
        <div className="grid grid-cols-2 gap-[12px] mb-5">
          {filtered.map((subject) => {
            const style = getSubjectStyle(subject.subjectName);
            return (
              <Link
                to={subject.subjectId}
                key={subject.subjectId}
                state={{ subjectName: subject.subjectName }}
                className="block"
              >
                <div className="bg-[#FFFFFF] border border-[#E4E4EC] p-[14px] rounded-[16px] hover:shadow-sm transition">
                  <div
                    className="rounded-[9px] h-[34px] w-[34px] flex items-center justify-center text-[16px]"
                    style={{ backgroundColor: style.bg }}
                  >
                    {style.icon}
                  </div>

                  <h3 className="text-[#3A3A3A] font-medium text-[13px] leading-[20px] mt-[20px] capitalize">
                    {subject.subjectName}
                  </h3>

                  <div className="flex items-center gap-2 mt-2">
                    <h4
                      className="rounded-[15px] px-[10px] py-[4px] text-[10px] font-medium whitespace-nowrap shrink-0"
                      style={{
                        backgroundColor: style.badgeBg,
                        color: style.badgeText,
                      }}
                    >
                      {subject.isMinorSubject ? "Minor" : "Core"}
                    </h4>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        )}
      </div>
    </div>
  )
}

export default Course
