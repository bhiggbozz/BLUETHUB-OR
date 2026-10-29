import { Check, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@bluethub/ui-kit";
import { useParentChildren } from "@/contexts/parent-children-context";
import { THEME_OPTIONS, useParentTheme } from "./theme";
import { ChildAvatar } from "../ui/child-avatar";
import { childName } from "../../lib/format";
import { PARENT_NAV } from "./nav-items";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
}

const itemCls =
  "group gap-3 rounded-xl px-3 py-2.5 data-[selected=true]:bg-(--pp-sunken) data-[selected=true]:text-(--pp-text)";

export function CommandPalette({ open, onOpenChange, onLogout }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { children: list, selectedChildId, setSelectedChildId } = useParentChildren();
  const { preference, setPreference } = useParentTheme();

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Bluethub"
      description="Jump to a page, switch child or log out"
      className="parent-ui top-[18%] text-(--pp-text) [&_[data-slot=command]]:bg-transparent [&_[data-slot=command]]:text-(--pp-text) [&_[cmdk-group-heading]]:text-(--pp-subtle) [&_[data-slot=command-input-wrapper]]:border-(--pp-line) [&_[data-slot=command-input-wrapper]_svg]:text-(--pp-subtle) max-w-[calc(100%-2rem)] translate-y-0 rounded-3xl border-(--pp-line) bg-(--pp-surface) shadow-(--pp-shadow-lg) sm:max-w-[560px]"
      showCloseButton={false}
    >
      <CommandInput placeholder="Where do you want to go?" className="text-[15px] text-(--pp-text) placeholder:text-(--pp-subtle)" />
      <CommandList className="max-h-[min(420px,60vh)] p-1.5">
        <CommandEmpty className="py-10 text-center text-[13px] text-(--pp-muted)">
          Nothing matches that. Try “attendance” or a child's name.
        </CommandEmpty>

        <CommandGroup heading="Go to">
          {PARENT_NAV.map((item) => (
            <CommandItem
              key={item.path}
              value={`${item.name} ${item.description}`}
              onSelect={() => run(() => navigate(item.path))}
              className={itemCls}
            >
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-(--pp-iris-soft) text-(--pp-iris)">
                <item.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-(--pp-text)">{item.name}</span>
                <span className="block truncate text-[12px] text-(--pp-subtle)">{item.description}</span>
              </span>
              <CommandShortcut className="pp-mono hidden text-[11px] sm:inline">G {item.hotkey.toUpperCase()}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        {list.length > 1 && (
          <>
            <CommandSeparator className="my-1 bg-(--pp-line)" />
            <CommandGroup heading="Switch child">
              {list.map((c) => (
                <CommandItem
                  key={c.studentId}
                  value={`child ${childName(c)} ${c.classroomName}`}
                  onSelect={() => run(() => setSelectedChildId(c.studentId))}
                  className={itemCls}
                >
                  <ChildAvatar id={c.studentId} firstName={c.firstName} lastName={c.lastName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-(--pp-text)">{childName(c)}</span>
                    <span className="block truncate text-[12px] text-(--pp-subtle)">{c.classroomName}</span>
                  </span>
                  {c.studentId === selectedChildId && <Check className="size-4 text-(--pp-iris)" aria-label="Selected" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator className="my-1 bg-(--pp-line)" />
        <CommandGroup heading="Appearance">
          {THEME_OPTIONS.map((o) => (
            <CommandItem
              key={o.value}
              value={`theme ${o.label} mode appearance ${o.value === "dark" ? "night" : o.value === "system" ? "auto match device" : "day"}`}
              onSelect={() => run(() => setPreference(o.value))}
              className={itemCls}
            >
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-(--pp-sunken) text-(--pp-muted)">
                <o.icon className="size-4" />
              </span>
              <span className="flex-1 text-[13px] font-semibold text-(--pp-text)">
                {o.value === "system" ? "Match my device" : `${o.label} theme`}
              </span>
              {preference === o.value && <Check className="size-4 text-(--pp-iris)" aria-label="Selected" />}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator className="my-1 bg-(--pp-line)" />
        <CommandGroup heading="Account">
          <CommandItem value="log out sign out" onSelect={() => run(onLogout)} className={itemCls}>
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-(--pp-absent-soft) text-(--pp-absent)">
              <LogOut className="size-4" />
            </span>
            <span className="text-[13px] font-semibold text-(--pp-text)">Log out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
