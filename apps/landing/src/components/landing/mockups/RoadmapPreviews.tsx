import { Check } from "lucide-react";
import type { RoadmapPreviewId } from "@/data/home";
import { APP, BrowserFrame } from "./frames";

/**
 * Concept previews for roadmap features. These screens do not exist yet:
 * every preview is labelled as a concept wherever it is shown.
 * Style matches the real apps/web mockups (#292382 indigo, white cards).
 */

const chip = (tone: "ok" | "warn" | "bad" | "muted") =>
  ({
    ok: "bg-emerald-50 text-emerald-800",
    warn: "bg-amber-50 text-amber-800",
    bad: "bg-rose-50 text-rose-800",
    muted: "bg-slate-100 text-slate-700",
  })[tone];

function TimetablePreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const grid = [
    ["Maths", "English", "Maths", "Science", "English"],
    ["Science", "Maths", "Civic", "Maths", "Computer"],
    ["English", "Computer", "Science", "English", "Maths"],
    ["Civic", "Science", "English", "Computer", "Science"],
  ];
  const tone: Record<string, string> = {
    Maths: "bg-indigo-50 text-indigo-800",
    English: "bg-sky-50 text-sky-800",
    Science: "bg-emerald-50 text-emerald-800",
    Civic: "bg-amber-50 text-amber-800",
    Computer: "bg-violet-50 text-violet-800",
  };
  return (
    <BrowserFrame path="/admin/timetable" label="Concept preview of a class timetable">
      <div className="bg-[#f8f9fc] p-4 text-[10px]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-bold" style={{ color: APP.ink }}>
            JSS 1 Gold · Timetable
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
            <Check className="size-3" /> No clashes
          </span>
        </div>
        <div className="grid grid-cols-[2.5rem_repeat(5,1fr)] gap-1">
          <span />
          {days.map((d) => (
            <span key={d} className="text-center text-[9px] font-semibold text-slate-600">
              {d}
            </span>
          ))}
          {grid.map((row, r) => (
            <div key={r} className="contents">
              <span className="pt-1.5 text-[9px] text-slate-600 tabular-nums">{8 + r}:00</span>
              {row.map((sub, c) => (
                <span key={c} className={`rounded-md px-1 py-1.5 text-center font-semibold ${tone[sub]}`}>
                  {sub}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

function CalendarPreview() {
  const events: Record<number, [string, string]> = {
    6: ["Resumption", "bg-indigo-600"],
    14: ["PTA meeting", "bg-amber-500"],
    20: ["Mid-term break", "bg-emerald-600"],
    21: ["Mid-term break", "bg-emerald-600"],
    27: ["Exams begin", "bg-rose-600"],
  };
  return (
    <BrowserFrame path="/calendar" label="Concept preview of the school calendar">
      <div className="bg-[#f8f9fc] p-4 text-[10px] text-slate-700">
        <p className="mb-2 text-[12px] font-bold" style={{ color: APP.ink }}>
          January 2027
        </p>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i} className="text-[9px] font-semibold text-slate-600">
              {d}
            </span>
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: 31 }).map((_, i) => {
            const day = i + 1;
            const ev = events[day];
            return (
              <span key={day} className="relative rounded-md bg-white py-1.5 tabular-nums ring-1 ring-black/[0.04]">
                {day}
                {ev && <span className={`absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full ${ev[1]}`} />}
              </span>
            );
          })}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px]">
          {["Resumption · Jan 6", "PTA meeting · Jan 14", "Mid-term break · Jan 20–21", "Exams · from Jan 27"].map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    </BrowserFrame>
  );
}

function LibraryPreview() {
  const loans: [string, string, string, "ok" | "warn" | "bad" | "muted"][] = [
    ["Things Fall Apart", "Tunde B. · JSS 2", "Due in 4 days", "ok"],
    ["New General Mathematics 2", "Adaeze N. · JSS 1", "Due tomorrow", "warn"],
    ["Basic Science for JSS", "Chioma O. · JSS 2", "6 days overdue", "bad"],
    ["The African Child", "Ibrahim K. · SS 1", "Returned", "muted"],
  ];
  return (
    <BrowserFrame path="/admin/library" label="Concept preview of library loans">
      <div className="bg-[#f8f9fc] p-4 text-[10px] text-slate-700">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-bold" style={{ color: APP.ink }}>
            Loans
          </p>
          <span className="text-slate-600">1,240 books · 86 on loan</span>
        </div>
        <ul className="space-y-1.5">
          {loans.map(([title, who, due, t]) => (
            <li key={title} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-black/[0.05]">
              <span className="min-w-0">
                <span className="block truncate font-semibold" style={{ color: APP.ink }}>
                  {title}
                </span>
                <span className="text-slate-600">{who}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${chip(t)}`}>{due}</span>
            </li>
          ))}
        </ul>
      </div>
    </BrowserFrame>
  );
}

export const ROADMAP_PREVIEWS: Record<RoadmapPreviewId, () => React.ReactElement> = {
  timetable: TimetablePreview,
  calendar: CalendarPreview,
  library: LibraryPreview,
};
