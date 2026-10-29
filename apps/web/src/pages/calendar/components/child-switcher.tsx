import { GraduationCap } from "lucide-react";
import type { ParentChild } from "@/services/parent";

interface ChildSwitcherProps {
  children: ParentChild[];
  /** null = all children. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function ChildSwitcher({ children, selectedId, onSelect }: ChildSwitcherProps) {
  if (children.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          selectedId === null ? "bg-[#4F61E8] text-white" : "border border-slate-200 text-slate-600 hover:border-[#4F61E8]/40"
        }`}
      >
        All children
      </button>
      {children.map((child) => {
        const active = child.studentId === selectedId;
        return (
          <button
            key={child.studentId}
            type="button"
            onClick={() => onSelect(child.studentId)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              active ? "bg-[#4F61E8] text-white" : "border border-slate-200 text-slate-600 hover:border-[#4F61E8]/40"
            }`}
          >
            <GraduationCap className="h-3 w-3" />
            {child.firstName} {child.lastName}
          </button>
        );
      })}
    </div>
  );
}

export default ChildSwitcher;
