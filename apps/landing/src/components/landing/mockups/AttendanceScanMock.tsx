import { Check, WifiOff } from "lucide-react";
import { APP, PhoneFrame } from "./frames";

const SCANNED = ["Adaeze N.", "Tunde B.", "Chioma O.", "Ibrahim K."];

/** Mirrors apps/web teacher attendance: choose a session type, scan student QR codes, works offline. */
export function AttendanceScanMock({ className }: { className?: string }) {
  return (
    <PhoneFrame label="Preview of a teacher taking QR attendance on a phone" className={className}>
      <div className="px-3.5 pt-8 pb-4 text-[10px]">
        <p className="text-[13px] font-bold" style={{ color: APP.ink }}>
          Attendance
        </p>
        <p className="mt-2 text-[9px] font-semibold text-slate-600">1 · Choose attendance type</p>
        <div className="mt-1.5 flex gap-1">
          {["Class", "Subject", "Topic"].map((t, i) => (
            <span
              key={t}
              className="rounded-full px-2 py-1 text-[9px] font-semibold"
              style={i === 0 ? { background: APP.indigo, color: "white" } : { background: "#f1f5f9", color: "#475569" }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="relative mt-3 aspect-square overflow-hidden rounded-xl bg-[#1d2233]">
          <div className="absolute inset-[18%] rounded-lg">
            {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
              <span key={c} className={`absolute size-5 rounded-[3px] border-white ${c}`} />
            ))}
            <div className="absolute inset-[22%] grid grid-cols-5 gap-[2px] opacity-90">
              {Array.from({ length: 25 }).map((_, i) => (
                <span key={i} className={(i * 7) % 3 === 0 ? "bg-white" : "bg-transparent"} />
              ))}
            </div>
            <span className="absolute inset-x-2 top-1/2 h-[2px] rounded-full bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          </div>
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 text-[8px] text-white">
            <WifiOff className="size-2.5" /> Offline · saved
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="font-semibold" style={{ color: APP.ink }}>
            Scanned
          </p>
          <p className="text-[9px] text-slate-600">18 of 24</p>
        </div>
        <ul className="mt-1.5 space-y-1">
          {SCANNED.map((n) => (
            <li key={n} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5">
              <span className="font-medium">{n}</span>
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="icon-bold size-2.5" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PhoneFrame>
  );
}
