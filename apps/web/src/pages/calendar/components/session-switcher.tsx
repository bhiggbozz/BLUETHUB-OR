import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@bluethub/ui-kit";
import type { CalendarSessionDto } from "@/services/calendar";

interface SessionSwitcherProps {
  sessions: CalendarSessionDto[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SessionSwitcher({ sessions, selectedId, onSelect }: SessionSwitcherProps) {
  if (sessions.length <= 1) return null;

  return (
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger className="w-full sm:w-56" aria-label="Switch academic year">
        <SelectValue placeholder="Choose a session" />
      </SelectTrigger>
      <SelectContent>
        {sessions.map((session) => (
          <SelectItem key={session.id} value={session.id}>
            {session.name} · {session.status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default SessionSwitcher;
