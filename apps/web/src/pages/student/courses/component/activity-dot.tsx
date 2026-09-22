import { cn } from "@/lib/utils";
import type { ActivityItem } from "../interfaces";



function ActivityDot({ color }: { color: ActivityItem["dotColor"] }) {
  const colorMap: Record<ActivityItem["dotColor"], string> = {
    green: "bg-emerald-500",
    blue: "bg-blue-500",
    orange: "bg-orange-500",
  };
  return <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", colorMap[color])} />;
}

export default ActivityDot