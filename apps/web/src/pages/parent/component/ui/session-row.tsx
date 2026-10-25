import { Check, X } from "lucide-react";
import type { AttendanceHistoryItem } from "@/services/attendance";
import { cn } from "@/lib/utils";
import { sessionTitle } from "../../lib/insights";
import { timeLabel } from "../../lib/format";
import { Badge } from "./feedback";

interface SessionRowProps {
  item: AttendanceHistoryItem;
  /** Show the timeline connector below the status dot. */
  connector?: boolean;
  showDate?: boolean;
}

export function SessionRow({ item, connector, showDate }: SessionRowProps) {
  const date = new Date(item.startedAt);
  const meta = [
    item.subTopicName && item.subTopicName !== sessionTitle(item) ? item.subTopicName : null,
    item.attendanceTypeName,
    item.classroomName,
  ].filter(Boolean);

  return (
    <li className="relative flex gap-3.5 px-5 py-3 sm:px-6">
      <div className="relative flex flex-col items-center pt-0.5">
        <span
          className={cn(
            "relative z-10 inline-flex size-6 items-center justify-center rounded-full ring-4 ring-(--pp-surface)",
            item.isPresent ? "bg-(--pp-present-soft) text-(--pp-present)" : "bg-(--pp-absent-soft) text-(--pp-absent)",
          )}
        >
          {item.isPresent ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
        </span>
        {connector && <span aria-hidden className="absolute top-7 -bottom-3 w-px bg-(--pp-line)" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[14px] font-semibold text-(--pp-text)">{sessionTitle(item)}</p>
          <Badge tone={item.isPresent ? "present" : "absent"} className="max-sm:sr-only">
            {item.isPresent ? "Present" : "Absent"}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-(--pp-subtle)">
          <span className="pp-num">
            {showDate ? `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ` : ""}
            {timeLabel(date)}
          </span>
          {meta.length > 0 && <> · {meta.join(" · ")}</>}
          {!item.isPresent ? null : item.attendedAt ? (
            <> · checked in {timeLabel(new Date(item.attendedAt))}</>
          ) : null}
        </p>
      </div>
    </li>
  );
}
