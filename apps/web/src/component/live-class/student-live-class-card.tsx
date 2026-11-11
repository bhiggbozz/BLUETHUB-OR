import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Clock, Video } from "lucide-react";
import { liveClassService, type LiveClassDto } from "@/services/live-class";
import { serverOffsetMs, secondsUntil, formatWAT, formatCountdown } from "@/utils/live-class-time";
import { cn } from "@/lib/utils";

/** Dashboard card per the brief's student state table:
 * - Scheduled, lesson still PendingApproval → never shown (the backend's
 *   `/mine` already excludes these for students entirely).
 * - Scheduled, before start → "Starts at … · in …" countdown.
 * - Scheduled, canStartNow → "Waiting for your teacher to start".
 * - Live → tap to join.
 * - Cancelled + Expired → "Missed: not started in time".
 * - Cancelled + anything else, or Ended → not shown here (a plain
 *   cancellation isn't the student's concern; Ended moves to the replay
 *   flow once published, not this card). */
export default function StudentLiveClassCard() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<LiveClassDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      liveClassService
        .getMine()
        .then((res) => {
          if (!cancelled) setClasses(res.data.data ?? []);
        })
        .catch(() => {
          // quiet — this is a dashboard nicety, not a page the student is
          // actively waiting on
        });
    };
    load();
    const poll = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  // Re-render every second so "in Xm Ys" countdowns stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const visible = classes.filter((c) => {
    if (c.status === "Scheduled" || c.status === "Live") return true;
    if (c.status === "Cancelled") return c.endReason === "Expired";
    return false;
  });

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((c) => {
        const offset = serverOffsetMs(c.serverTime);
        const isLive = c.status === "Live";
        const isMissed = c.status === "Cancelled" && c.endReason === "Expired";
        const secondsLeft = c.scheduledStart ? secondsUntil(c.scheduledStart, offset) : 0;

        if (isMissed) {
          return (
            <div key={c.id} className="flex items-center gap-2.5 rounded-[20px] bg-gray-100 p-3 text-gray-500">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{c.title || `${c.subjectName} class`}</p>
                <p className="text-xs text-gray-400">Missed: not started in time</p>
              </div>
            </div>
          );
        }

        const subtitle = isLive
          ? "Tap to join"
          : c.canStartNow
            ? "Waiting for your teacher to start"
            : c.scheduledStart
              ? `Starts ${formatWAT(c.scheduledStart)}${secondsLeft > 0 ? ` · in ${formatCountdown(secondsLeft)}` : ""}`
              : "Scheduled";

        return (
          <button
            key={c.id}
            onClick={() => isLive && navigate("/student/live-class")}
            disabled={!isLive}
            className={cn(
              "flex w-full items-center justify-between rounded-[20px] p-3 text-white transition-transform",
              isLive
                ? "bg-gradient-to-r from-[#f2485b] via-[#f65a63] to-[#ff7b59] shadow-[0_22px_45px_-24px_rgba(242,72,91,0.7)] active:scale-[0.99]"
                : "cursor-default bg-gradient-to-r from-slate-500 to-slate-600"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                {isLive ? <Play className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">{c.title || `${c.subjectName} class`}</p>
                <p className="text-xs text-white/80">{subtitle}</p>
              </div>
            </div>
            {isLive && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                <span className="text-xs font-semibold">Join</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
