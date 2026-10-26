import { Clock, Keyboard, ListChecks, Mic, PenLine } from "lucide-react";
import { APP, BrowserFrame } from "./frames";

/** Mirrors apps/web student assessment attempt: answer by choosing, typing, drawing on a board or recording audio. */
export function StudentAssessmentMock({ className }: { className?: string }) {
  return (
    <BrowserFrame path="/student/assessment" label="Preview of a student answering an assessment question by drawing" className={className}>
      <div className="bg-[#f8f9fc] p-4 text-[10px]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold tracking-wide text-slate-600 uppercase">Mathematics · Mid-term assessment</p>
            <p className="mt-0.5 text-[12px] font-bold" style={{ color: APP.ink }}>
              Question 3 of 10
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">
            <Clock className="size-3" /> 18:24 left
          </span>
        </div>
        <div className="mt-2 h-1 rounded-full bg-slate-200">
          <div className="h-1 w-[30%] rounded-full" style={{ background: APP.indigo }} />
        </div>

        <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-black/[0.05]">
          <p className="text-[11px] font-medium" style={{ color: APP.ink }}>
            Sketch the graph of y = x² − 4 and mark where it crosses the x-axis.
          </p>
          <div className="mt-2.5 flex gap-1">
            {[
              { icon: ListChecks, label: "Choose" },
              { icon: Keyboard, label: "Type" },
              { icon: PenLine, label: "Draw", on: true },
              { icon: Mic, label: "Speak" },
            ].map(({ icon: Icon, label, on }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold"
                style={on ? { background: APP.indigo, color: "white" } : { background: "#f1f5f9", color: "#475569" }}
              >
                <Icon className="size-3" /> {label}
              </span>
            ))}
          </div>
          <div className="relative mt-2.5 aspect-[16/6.5] rounded-md bg-[#fbfcff] ring-1 ring-dashed ring-slate-300">
            <svg viewBox="0 0 300 120" className="absolute inset-0 size-full" fill="none" strokeLinecap="round">
              <path d="M150 112 v-104 M20 84 h260" stroke="#94a3b8" strokeWidth="1.2" />
              <path d="M98 16 q52 136 104 0" stroke={APP.indigo} strokeWidth="2.4" />
              <circle cx="124" cy="84" r="3" fill="#ef4444" />
              <circle cx="176" cy="84" r="3" fill="#ef4444" />
              <path d="M112 98 l4 -8 M188 98 l-4 -8" stroke="#ef4444" strokeWidth="1.4" />
            </svg>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-slate-600">Saved on this device</span>
          <span className="rounded-md px-3 py-1.5 font-semibold text-white" style={{ background: APP.indigo }}>
            Submit all
          </span>
        </div>
      </div>
    </BrowserFrame>
  );
}
