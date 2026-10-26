import { Circle, Eraser, Mic, MousePointer2, PenLine, Plus, Square, Type } from "lucide-react";
import { APP, BrowserFrame } from "./frames";

/** Mirrors apps/web /teacher/board: Live recording, timer, mic, multi-board selector (B1, B2, +), tools. */
export function WhiteboardMock({ className }: { className?: string }) {
  return (
    <BrowserFrame path="/teacher/board" label="Preview of a teacher recording a whiteboard lesson with voice" className={className}>
      <div className="bg-[#eef0f6] text-[10px]">
        <div className="flex items-center justify-between bg-white px-3 py-2 ring-1 ring-black/[0.05]">
          <span className="font-semibold" style={{ color: APP.ink }}>
            Mathematics · Quadratic equations
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-600">
              <span className="size-1.5 rounded-full bg-red-500" /> Live
            </span>
            <span className="font-mono text-slate-600 tabular-nums">12:48</span>
            <span className="inline-flex size-5 items-center justify-center rounded-full text-white" style={{ background: APP.indigo }}>
              <Mic className="size-3" />
            </span>
          </span>
        </div>

        <div className="relative m-3 aspect-[16/8.5] rounded-md bg-white ring-1 ring-black/[0.05]">
          <svg viewBox="0 0 400 210" className="absolute inset-0 size-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <g stroke={APP.ink} strokeWidth="2.2">
              {/* "x² + 5x + 6 = 0" in handwriting-like strokes */}
              <path d="M30 40 l14 18 M44 40 l-14 18" />
              <path d="M50 34 q5 -6 9 0 q-2 5 -9 9 h10" strokeWidth="1.6" />
              <path d="M72 49 h14 M79 42 v14" />
              <path d="M104 38 h-10 l-2 9 q10 -4 12 4 q-2 9 -13 4" />
              <path d="M112 40 l14 18 M126 40 l-14 18" />
              <path d="M138 49 h14 M145 42 v14" />
              <path d="M172 38 q-12 2 -12 12 q0 9 8 8 q8 -1 6 -8 q-3 -6 -12 -2" />
              <path d="M188 46 h14 M188 53 h14" />
              <path d="M222 40 q-10 0 -10 9 q0 9 10 9 q10 0 10 -9 q0 -9 -10 -9" />
            </g>
            {/* "x = -2, -3" */}
            <g stroke={APP.indigo} strokeWidth="2.2">
              <path d="M30 88 l14 18 M44 88 l-14 18" />
              <path d="M56 95 h12 M56 101 h12" />
              <path d="M78 98 h8" />
              <path d="M92 90 q8 -6 12 2 q2 6 -12 14 h14" />
              <path d="M112 108 l-3 5" />
              <path d="M124 98 h8" />
              <path d="M138 90 q10 -4 11 4 q-1 4 -6 5 q8 1 7 6 q-3 8 -13 3" />
            </g>
            {/* parabola sketch */}
            <path d="M250 190 v-160 M240 150 h140" stroke="#94a3b8" strokeWidth="1.4" />
            <path d="M262 40 q38 210 76 0" stroke={APP.indigo} strokeWidth="2.6" />
            <circle cx="286" cy="150" r="3.5" fill="#ef4444" />
            <circle cx="314" cy="150" r="3.5" fill="#ef4444" />
            <path d="M276 172 q10 8 18 -14" stroke="#ef4444" strokeWidth="1.4" />
          </svg>
        </div>

        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-black/[0.05]">
            {[
              { b: "B1", on: true },
              { b: "B2", on: false },
            ].map(({ b, on }) => (
              <span
                key={b}
                className="rounded-md px-2 py-1 font-semibold"
                style={on ? { background: APP.indigo, color: "white" } : { color: "#64748b" }}
              >
                {b}
              </span>
            ))}
            <span className="inline-flex size-5 items-center justify-center rounded-md text-slate-500">
              <Plus className="size-3" />
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-black/[0.05]">
            {[MousePointer2, PenLine, Eraser, Square, Circle, Type].map((Icon, i) => (
              <span
                key={i}
                className="inline-flex size-5 items-center justify-center rounded-md"
                style={i === 1 ? { background: `${APP.indigo}18`, color: APP.indigo } : { color: "#64748b" }}
              >
                <Icon className="size-3" />
              </span>
            ))}
            {["#12122A", "#292382", "#ef4444"].map((c) => (
              <span key={c} className="mx-0.5 size-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
