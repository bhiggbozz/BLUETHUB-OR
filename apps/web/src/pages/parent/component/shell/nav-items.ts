import { CalendarCheck2, LayoutGrid, Sparkles, type LucideIcon } from "lucide-react";

export interface ParentNavItem {
  name: string;
  short: string;
  path: string;
  icon: LucideIcon;
  description: string;
  /** Second key of the "g then x" shortcut. */
  hotkey: string;
  end?: boolean;
}

export const PARENT_NAV: ParentNavItem[] = [
  {
    name: "Overview",
    short: "Overview",
    path: "/parent",
    icon: LayoutGrid,
    description: "This month at a glance, with suggested next steps",
    hotkey: "o",
    end: true,
  },
  {
    name: "Attendance",
    short: "Attendance",
    path: "/parent/attendance",
    icon: CalendarCheck2,
    description: "Rates, a 12-week calendar and every recorded session",
    hotkey: "a",
  },
  {
    name: "Practice assessment",
    short: "Practice",
    path: "/parent/assessment",
    icon: Sparkles,
    description: "Build a quick quiz from topics your child was taught",
    hotkey: "p",
  },
];

export const isNavActive = (item: ParentNavItem, pathname: string) =>
  item.end ? pathname === item.path || pathname === `${item.path}/` : pathname.startsWith(item.path);
