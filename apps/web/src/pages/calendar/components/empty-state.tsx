import { CalendarPlus, CalendarClock, Lock } from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import { useNavigate } from "react-router-dom";
import type { CalendarWriteAccess } from "../hooks/use-can-manage-calendar";

export function CalendarEmptyState({ access }: { access: CalendarWriteAccess }) {
  const navigate = useNavigate();

  if (access.status === "granted") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forestBlue-light/10">
          <CalendarPlus className="h-6 w-6 text-forestBlue-light" />
        </div>
        <p className="text-sm font-semibold text-foreground">No academic year set up yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Define your session and terms so everyone in the school can see the academic calendar.
        </p>
        <Button onClick={() => navigate("/calendar/setup")} className="mt-1 bg-forestBlue-light hover:bg-forestBlue-light/90">
          Set up your academic year
        </Button>
      </div>
    );
  }

  if (access.status === "denied-needs-permission") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/60 px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-sm font-semibold text-foreground">No academic year set up yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">Ask your SuperAdministrator to give you calendar access.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/60 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <CalendarClock className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">Your school hasn't published its calendar yet.</p>
      <p className="max-w-xs text-xs text-muted-foreground">Check back soon.</p>
    </div>
  );
}

export default CalendarEmptyState;
