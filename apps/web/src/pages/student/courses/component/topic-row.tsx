import { cn } from "@/lib/utils";
import { Card, CardContent } from "@bluethub/ui-kit";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
// import TopicStatusBadgeClasses from "./topic-status-badge-classes";
import type { Topic } from "../interfaces";

// Falls back to "?" for an empty/whitespace-only name rather than rendering
// nothing, and caps at 2 characters so long topic names don't overflow the tile.
function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function TopicRow({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-none shadow-sm p-0 font-poppins">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#292382]/10 text-sm font-semibold text-[#292382]">
          {getInitials(topic.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#3A3A3A] sm:text-base">
            {topic.name}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground sm:text-sm">
              {topic.subTopics.length} Lessons
            </span>
            {/* <Badge className={cn("rounded-full text-[11px] font-medium", TopicStatusBadgeClasses(topic.status))}>
              {topic.status}
            </Badge> */}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <CardContent className="pt-0 pl-7 pr-4 pb-4">
          {/* <Progress value={topic.progressPercent} className="mb-3 h-1.5" /> */}
          {topic.subTopics.length === 0 ? (
            <p className="text-sm text-[#A0A0B5]">No lessons in this topic yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {topic.subTopics.map((sub) => (
                <li key={sub.id} className="flex items-center gap-3">
                  <div className="p-1 rounded-full  bg-[#34C759]"></div>
                  <span
                    className={cn(
                      "truncate text-sm sm:text-base text-[#A0A0B5]"
                    )}
                  >
                    {sub.name}
                  </span>
                  {/* <Badge className={cn("shrink-0 rounded-full text-[11px] font-medium", resourceBadgeClasses(sub.resourceType))}>
                    {sub.resourceType}
                  </Badge> */}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default TopicRow;