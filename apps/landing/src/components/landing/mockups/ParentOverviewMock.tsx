import { TrendingDown, TrendingUp } from "lucide-react";
import { BrowserFrame } from "./frames";

const RING = 2 * Math.PI * 34;

/** Mirrors apps/web /parent overview: child spotlight, this month's rate, sessions/present/absent, patterns. */
export function ParentOverviewMock({ className }: { className?: string }) {
  return (
    <BrowserFrame path="/parent" label="Preview of the parent overview showing a child's attendance this month" className={className}>
      <div className="bg-[#f4f5fa] p-4 text-[10px]">
        <p className="text-[9px] font-semibold tracking-[0.1em] text-slate-600 uppercase">Good afternoon</p>
        <p className="mt-0.5 font-serif text-[15px] text-[#10122b]">Here's how things are going at school</p>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-[1.35fr_1fr]">
          <div className="rounded-xl bg-[radial-gradient(14rem_8rem_at_100%_0%,rgba(124,131,255,0.45),transparent_60%),linear-gradient(160deg,#1a1d3d,#0b0d1f_70%)] p-3 text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-600 to-pink-400 text-[9px] font-bold">AO</span>
              <span>
                <span className="block text-[11px] font-semibold">Ada Okafor</span>
                <span className="block text-[9px] text-white/60">JSS 2 Gold</span>
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <svg viewBox="0 0 80 80" className="size-[4.5rem] -rotate-90">
                <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.12)" strokeWidth="7" fill="none" />
                <circle cx="40" cy="40" r="34" stroke="#f2a53f" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={`${RING * 0.89} ${RING}`} />
                <text x="40" y="44" textAnchor="middle" fill="white" fontSize="15" fontWeight="600" transform="rotate(90 40 40)">
                  89%
                </text>
              </svg>
              <div>
                <p className="text-[8px] font-semibold tracking-[0.1em] text-white/50 uppercase">Attendance this month</p>
                <p className="text-[12px] font-semibold">Worth watching</p>
                <p className="text-[9px] text-white/60">Present for 34 of 38 sessions</p>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {[
                ["Sessions", "38", "text-white/70"],
                ["Present", "34", "text-emerald-300"],
                ["Absent", "4", "text-rose-300"],
              ].map(([l, v, c]) => (
                <div key={l} className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1.5">
                  <p className={`text-[8px] ${c}`}>{l}</p>
                  <p className="text-[12px] font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-3 ring-1 ring-black/[0.05]">
            <p className="text-[8px] font-semibold tracking-[0.1em] text-slate-600 uppercase">What stands out</p>
            <ul className="mt-2 space-y-2.5">
              <li className="flex gap-2">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <TrendingUp className="size-3" />
                </span>
                <span>
                  <span className="block font-semibold text-[#10122b]">Present for the last 12 sessions in a row</span>
                  <span className="text-[9px] text-slate-600">A steady run.</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                  <TrendingDown className="size-3" />
                </span>
                <span>
                  <span className="block font-semibold text-[#10122b]">Basic Science has the lowest attendance at 67%</span>
                  <span className="text-[9px] text-slate-600">Present for 6 of 9 sessions.</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
