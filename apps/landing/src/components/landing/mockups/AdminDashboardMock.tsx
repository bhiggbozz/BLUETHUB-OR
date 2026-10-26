import { BarChart3, CheckSquare, ClipboardList, LayoutDashboard, UserPlus } from "lucide-react";
import { APP, BrowserFrame } from "./frames";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: BarChart3, label: "Analytics" },
  { icon: CheckSquare, label: "Approvals" },
  { icon: UserPlus, label: "Registration" },
  { icon: ClipboardList, label: "Assessment" },
];

const CLASSES = [
  { name: "JSS 1 Gold", avg: 74, pass: 82 },
  { name: "JSS 2 Gold", avg: 68, pass: 71 },
  { name: "SS 1 Science", avg: 81, pass: 90 },
];

const QUIZZES = [
  { quiz: "Fractions · MTH-4K2", attempts: 32, avg: "76%", pass: "84%" },
  { quiz: "Parts of speech · ENG-9QF", attempts: 29, avg: "71%", pass: "79%" },
  { quiz: "States of matter · BSC-2LD", attempts: 31, avg: "63%", pass: "65%" },
];

/** Mirrors apps/web admin dashboard: "Performance by Classroom" + quiz breakdown. */
export function AdminDashboardMock({ className }: { className?: string }) {
  return (
    <BrowserFrame path="/admin" label="Preview of the Bluethub admin dashboard showing performance by classroom" className={className}>
      <div className="flex min-h-[19rem] bg-[#f8f9fc] text-[10px]">
        <aside className="hidden w-32 shrink-0 border-r border-black/[0.06] bg-white p-3 sm:block">
          <div className="mb-4 flex items-center gap-1.5">
            <img src="/logo-192.png" alt="" className="size-5" />
            <span className="text-[11px] font-bold">Bluethub</span>
          </div>
          <ul className="space-y-0.5">
            {NAV.map((n) => (
              <li
                key={n.label}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
                style={n.active ? { background: `${APP.indigo}14`, color: APP.indigo, fontWeight: 600 } : { color: "#64748b" }}
              >
                <n.icon className="size-3" />
                {n.label}
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-bold" style={{ color: APP.ink }}>
              Dashboard
            </p>
            <span className="rounded-full bg-white px-2 py-1 text-[9px] text-slate-500 ring-1 ring-black/5">This term</span>
          </div>

          <p className="mb-2 text-[10px] font-semibold text-slate-600">Performance by Classroom</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {CLASSES.map((c) => (
              <div key={c.name} className="rounded-lg bg-white p-2.5 ring-1 ring-black/[0.05]">
                <p className="truncate font-semibold" style={{ color: APP.ink }}>
                  {c.name}
                </p>
                <p className="mt-1 text-[15px] font-bold" style={{ color: APP.indigo }}>
                  {c.avg}%
                </p>
                <p className="text-[8.5px] text-slate-500">Avg score · {c.pass}% pass</p>
                <div className="mt-1.5 h-1 rounded-full bg-slate-100">
                  <div className="h-1 rounded-full" style={{ width: `${c.avg}%`, background: APP.indigo }} />
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg bg-white ring-1 ring-black/[0.05]">
            <p className="border-b border-black/[0.05] px-3 py-2 font-semibold" style={{ color: APP.ink }}>
              JSS 1 Gold : Quiz Breakdown
            </p>
            <table className="w-full text-left">
              <thead className="text-[8.5px] text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Quiz</th>
                  <th className="px-2 py-1.5 font-medium">Attempts</th>
                  <th className="px-2 py-1.5 font-medium">Avg Score</th>
                  <th className="px-2 py-1.5 font-medium">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {QUIZZES.map((q) => (
                  <tr key={q.quiz} className="border-t border-black/[0.04]">
                    <td className="truncate px-3 py-1.5 font-medium" style={{ color: APP.ink }}>
                      {q.quiz}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600">{q.attempts}</td>
                    <td className="px-2 py-1.5 text-slate-600">{q.avg}</td>
                    <td className="px-2 py-1.5 font-semibold text-emerald-600">{q.pass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
