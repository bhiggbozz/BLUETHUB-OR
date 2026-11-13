import { DatePicker, Input, Label } from "@bluethub/ui-kit";
import type { SessionFormErrors } from "../utils";

interface StepSessionProps {
  name: string;
  startDate: string;
  endDate: string;
  errors: SessionFormErrors;
  onChange: (patch: Partial<{ name: string; startDate: string; endDate: string }>) => void;
}

export function StepSession({ name, startDate, endDate, errors, onChange }: StepSessionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="wizard-session-name">Session name</Label>
        <Input
          id="wizard-session-name"
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="2026/2027"
        />
        {errors.name && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wizard-session-start">Start date</Label>
          <DatePicker
            id="wizard-session-start"
            value={startDate}
            onChange={(v) => onChange({ startDate: v })}
          />
          {errors.startDate && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.startDate}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wizard-session-end">End date</Label>
          <DatePicker
            id="wizard-session-end"
            value={endDate}
            onChange={(v) => onChange({ endDate: v })}
          />
          {errors.endDate && <p role="alert" aria-live="polite" className="text-xs text-rose-600">{errors.endDate}</p>}
        </div>
      </div>
    </div>
  );
}

export default StepSession;
