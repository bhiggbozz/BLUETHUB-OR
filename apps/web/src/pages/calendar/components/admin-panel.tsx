import { useNavigate } from "react-router-dom";
import { CalendarPlus, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import { MAX_TERMS } from "../utils";

interface CalendarAdminPanelProps {
  termCount: number;
  onEditYear: () => void;
  onAddTerm: () => void;
  onDeleteYear: () => void;
}

/** Groups every "manage this calendar" action into one place instead of
 * scattering them as inline buttons across the session header and the
 * terms list header. Only ever rendered when `canManage` is true (the
 * caller gates that, same as the buttons it replaces used to). */
export function CalendarAdminPanel({ termCount, onEditYear, onAddTerm, onDeleteYear }: CalendarAdminPanelProps) {
  const navigate = useNavigate();
  const atMaxTerms = termCount >= MAX_TERMS;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 lg:sticky lg:top-[4.5rem]">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Settings2 className="h-4 w-4 text-forestBlue-light" />
        Admin controls
      </div>

      <div className="space-y-2">
        <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onEditYear}>
          <Pencil className="h-3.5 w-3.5" /> Edit year
        </Button>

        <Button
          type="button"
          size="sm"
          className="w-full justify-start gap-2 bg-forestBlue-light hover:bg-forestBlue-light/90"
          disabled={atMaxTerms}
          title={atMaxTerms ? `A session can have at most ${MAX_TERMS} terms` : undefined}
          onClick={onAddTerm}
        >
          <Plus className="h-3.5 w-3.5" /> Add term
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => navigate("/calendar/setup")}
        >
          <CalendarPlus className="h-3.5 w-3.5" /> New academic year
        </Button>

        <div className="border-t border-border pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
            onClick={onDeleteYear}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete year
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CalendarAdminPanel;
