import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@bluethub/ui-kit";
import { cn } from "@/lib/utils";
import { useParentChildren } from "@/contexts/parent-children-context";
import { ChildAvatar } from "../ui/child-avatar";
import { childName } from "../../lib/format";

interface ChildSwitcherProps {
  /** "rail" sits on the dark sidebar; "bar" sits on the light mobile top bar. */
  variant: "rail" | "bar";
  className?: string;
}

/**
 * Global child selector. Every parent page reads the same selection from
 * ParentChildrenContext, so switching here updates the whole portal.
 */
export function ChildSwitcher({ variant, className }: ChildSwitcherProps) {
  const { children: list, loading, selectedChild, selectedChildId, setSelectedChildId } = useParentChildren();
  const dark = variant === "rail";

  if (loading) {
    return (
      <div className={cn("flex items-center gap-3 rounded-2xl p-2.5", dark ? "bg-white/5" : "", className)}>
        <div className={cn("size-10 rounded-xl", dark ? "bg-white/10" : "pp-skeleton")} />
        {dark && (
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-2.5 w-16 rounded bg-white/10" />
          </div>
        )}
      </div>
    );
  }

  if (!selectedChild) return null;

  const body = (
    <>
      <ChildAvatar
        id={selectedChild.studentId}
        firstName={selectedChild.firstName}
        lastName={selectedChild.lastName}
        size={dark ? "md" : "sm"}
      />
      <span className={cn("min-w-0 flex-1 text-left", !dark && "hidden min-[380px]:block")}>
        <span className={cn("block truncate text-[13px] font-semibold", dark ? "text-white" : "text-(--pp-text)")}>
          {childName(selectedChild)}
        </span>
        <span className={cn("block truncate text-[11px]", dark ? "text-white/55" : "text-(--pp-subtle)")}>
          {selectedChild.classroomName || "Class not set"}
        </span>
      </span>
    </>
  );

  const shell = cn(
    "flex w-full items-center gap-3 rounded-2xl transition-colors",
    dark ? "p-2.5 bg-white/[0.04] border border-white/[0.06]" : "p-1 pr-2",
    className,
  );

  if (list.length < 2) {
    return (
      <div className={shell} aria-label={`Viewing ${childName(selectedChild)}`}>
        {body}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(shell, dark ? "hover:bg-white/[0.08]" : "hover:bg-(--pp-text)/5")}
          aria-label={`Viewing ${childName(selectedChild)}. Switch child`}
        >
          {body}
          <ChevronsUpDown className={cn("size-4 shrink-0", dark ? "text-white/45" : "text-(--pp-subtle)")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="parent-ui w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-2xl border-(--pp-line) bg-(--pp-surface) p-1.5 shadow-(--pp-shadow-lg)"
      >
        <DropdownMenuLabel className="pp-eyebrow px-2.5 py-2">Your children</DropdownMenuLabel>
        {list.map((c) => {
          const active = c.studentId === selectedChildId;
          return (
            <DropdownMenuItem
              key={c.studentId}
              onSelect={() => setSelectedChildId(c.studentId)}
              className="cursor-pointer gap-3 rounded-xl px-2.5 py-2 focus:bg-(--pp-sunken)"
            >
              <ChildAvatar id={c.studentId} firstName={c.firstName} lastName={c.lastName} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-(--pp-text)">{childName(c)}</span>
                <span className="block truncate text-[11px] text-(--pp-subtle)">{c.classroomName}</span>
              </span>
              {active && <Check className="size-4 text-(--pp-iris)" aria-label="Selected" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
