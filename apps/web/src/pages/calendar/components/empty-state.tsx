import { CalendarPlus, CalendarClock, Lock } from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import { useNavigate } from "react-router-dom";
import type { CalendarWriteAccess } from "../hooks/use-can-manage-calendar";

export function CalendarEmptyState({ access }: { access: CalendarWriteAccess }) {
  const navigate = useNavigate();

  if (access.status === "granted") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F61E8]/10">
          <CalendarPlus className="h-6 w-6 text-[#4F61E8]" />
        </div>
        <p className="text-sm font-semibold text-slate-700">No academic year set up yet</p>
        <p className="max-w-xs text-xs text-slate-500">
          Define your session and terms so everyone in the school can see the academic calendar.
        </p>
        <Button onClick={() => navigate("/calendar/setup")} className="mt-1 bg-[#4F61E8] hover:bg-[#4F61E8]/90">
          Set up your academic year
        </Button>
      </div>
    );
  }

  if (access.status === "denied-needs-permission") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-sm font-semibold text-slate-700">No academic year set up yet</p>
        <p className="max-w-xs text-xs text-slate-500">Ask your SuperAdministrator to give you calendar access.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <CalendarClock className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">Your school hasn't published its calendar yet.</p>
      <p className="max-w-xs text-xs text-slate-500">Check back soon.</p>
    </div>
  );
}

export default CalendarEmptyState;
