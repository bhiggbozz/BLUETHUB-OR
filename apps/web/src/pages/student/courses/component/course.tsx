// import { Input } from "@bluethub/ui-kit"
import { Link } from "react-router-dom";
import { performanceService, type MyCourseListItemDto } from "@/services/performance";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, Loader2, BookX, RefreshCw } from "lucide-react";

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
        <div className="mb-6">
          <h1 className="text-[#1D1B39] font-semibold text-xl leading-tight">
            Choose a subject
          </h1>
          <p className="text-[#7A7A93] text-sm mt-1">
            Select a subject to see your quiz and assessment performance
          </p>

          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#A5A5BC]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white border border-[#E9E9F2] text-sm text-[#1D1B39] placeholder:text-[#A5A5BC] outline-none focus:border-[#292382] focus:ring-4 focus:ring-[#292382]/10 transition"
            />
          </div>
        </div>

        {/* --- Subject grid section --- */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[#1D1B39] font-semibold text-sm">All Subjects</h2>
            <span className="bg-[#EEF0FD] text-[#292382] rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              {subjects.length}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#7A7A93]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-xs">Loading your subjects...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="size-14 rounded-2xl bg-[#F6F7FC] flex items-center justify-center">
                <BookX className="w-6 h-6 text-[#A5A5BC]" />
              </div>
              <p className="text-sm font-medium text-[#1D1B39] max-w-xs">
                {loadError || "No subjects registered for this student yet."}
              </p>
              <p className="text-xs text-[#7A7A93] max-w-xs">
                Ask your school admin to confirm your class and subject assignment.
              </p>
              {loadError && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#292382] hover:underline"
                >
                  <RefreshCw className="size-3.5" />
                  Try again
                </button>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-sm font-medium text-[#1D1B39]">
                No subjects match "{search}"
              </p>
              <p className="text-xs text-[#7A7A93]">Try a different search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {filtered.map((subject) => {
                const style = getSubjectStyle(subject.subjectName);
                // Optional performance hint — only renders if your API sends it.
                // Swap `averageScore` for whatever field name your DTO actually uses.
                const avgScore = (subject as { averageScore?: number }).averageScore;
                const hasScore = typeof avgScore === "number";

                return (
                  <Link
                    to={subject.subjectId}
                    key={subject.subjectId}
                    state={{ subjectName: subject.subjectName }}
                    className="group block"
                  >
                    <div className="bg-white border border-[#E9E9F2] p-4 rounded-2xl transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[#D8D9F0] group-hover:shadow-[0_8px_24px_-8px_rgba(41,35,130,0.12)]">
                      <div
                        className="rounded-xl h-11 w-11 flex items-center justify-center text-lg transition-transform duration-200 group-hover:scale-105"
                        style={{ backgroundColor: style.bg }}
                      >
                        {style.icon}
                      </div>

                      <h3 className="text-[#1D1B39] font-medium text-sm leading-snug mt-4 capitalize">
                        {subject.subjectName}
                      </h3>

                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                          style={{
                            backgroundColor: style.badgeBg,
                            color: style.badgeText,
                          }}
                        >
                          {subject.isMinorSubject ? "Minor" : "Core"}
                        </span>

                        {hasScore ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${avgScore! >= 70
                                ? "bg-[#E8F7EE] text-[#16A34A]"
                                : avgScore! >= 40
                                  ? "bg-[#FEF3E2] text-[#B45309]"
                                  : "bg-[#FDEDED] text-[#DC2626]"
                              }`}
                          >
                            {avgScore}% avg
                          </span>
                        ) : (
                          <span className="rounded-full px-2.5 py-1 text-[10px] font-medium bg-[#F6F7FC] text-[#A5A5BC]">
                            Not started
                          </span>
                        )}
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
