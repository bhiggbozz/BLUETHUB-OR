import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, LogOut, MoreHorizontal, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bluethub/ui-kit";
import bluethub from "@/assets/png/bluethub.png";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/auth-context";
import { useParentChildren } from "@/contexts/parent-children-context";
import { localData } from "@/utils";
import type { schoolInfo } from "@/services";
import { ChildSwitcher } from "./shell/child-switcher";
import { THEME_OPTIONS, ThemeSwitch, useParentTheme } from "./shell/theme";
import { PARENT_NAV, isNavActive } from "./shell/nav-items";
import { springy } from "./ui/motion";
import { Kbd } from "./ui/feedback";
import { isApplePlatform } from "../lib/format";

function useSchool() {
  const school = localData.retrieve("schoolInfo") as schoolInfo | null;
  return { name: school?.schoolName || "Bluethub", logo: school?.logoUrl || bluethub };
}

function useParentName() {
  const { user } = useAuthContext();
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Parent";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "P";
  return { name, initials, email: user?.emailAddress };
}

interface ShellActions {
  onOpenPalette: () => void;
  onRequestLogout: () => void;
}

/* ─────────────────────────── Desktop rail ─────────────────────────── */

export default function ParentSideBar({ onOpenPalette, onRequestLogout }: ShellActions) {
  const { pathname } = useLocation();
  const school = useSchool();
  const parent = useParentName();
  const modKey = isApplePlatform() ? "⌘" : "Ctrl";
  const { loading: childrenLoading, selectedChild } = useParentChildren();

  return (
    <aside className="pp-rail pp-scroll-thin relative hidden h-full w-[272px] shrink-0 flex-col overflow-y-auto lg:flex" aria-label="Parent navigation">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <img src={school.logo} alt="" className="size-8 rounded-xl bg-white/10 object-cover" />
        <div className="min-w-0">
          <p className="pp-display truncate text-[14px] font-semibold text-white">{school.name}</p>
          <p className="text-[11px] text-white/45">Parent portal</p>
        </div>
      </div>

      {(childrenLoading || selectedChild) && (
        <div className="px-3">
          <p className="pp-eyebrow mb-2 px-2 text-white/40!">Viewing</p>
          <ChildSwitcher variant="rail" />
        </div>
      )}

      <button
        type="button"
        onClick={onOpenPalette}
        className="mx-3 mt-4 flex h-10 items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 text-left text-[13px] text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white/80"
      >
        <Search className="size-4" />
        <span className="flex-1">Search or jump to…</span>
        <span className="flex items-center gap-1 text-white/60">
          <Kbd className="border-white/20">{modKey}</Kbd>
          <Kbd className="border-white/20">K</Kbd>
        </span>
      </button>

      <nav className="mt-6 flex-1 space-y-1 px-3">
        <p className="pp-eyebrow mb-2 px-2 text-white/40!">Menu</p>
        {PARENT_NAV.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={cn(
                "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors",
                active ? "text-white" : "text-white/55 hover:text-white/90",
              )}
            >
              {active && (
                <motion.span
                  layoutId="rail-active"
                  transition={springy}
                  className="absolute inset-0 rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.12] to-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                />
              )}
              {active && (
                <motion.span
                  layoutId="rail-glow"
                  transition={springy}
                  className="absolute top-1/2 -left-3 h-5 w-1 -translate-y-1/2 rounded-r-full bg-(--pp-glow) shadow-[0_0_12px_2px_rgba(124,131,255,0.6)]"
                />
              )}
              <item.icon className={cn("relative size-[18px]", active ? "text-(--pp-glow)" : "")} />
              <span className="relative flex-1">{item.name}</span>
              <span className="pp-mono relative hidden text-[10px] text-white/30 group-hover:inline">
                G {item.hotkey.toUpperCase()}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <p className="pp-eyebrow mb-2 px-2 text-white/40!">Appearance</p>
        <ThemeSwitch />
      </div>

      <div className="border-t border-(--pp-ink-line) p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/[0.06]"
              aria-label="Account menu"
            >
              <span className="pp-display inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-white">
                {parent.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-white">{parent.name}</span>
                <span className="block truncate text-[11px] text-white/45">{parent.email || "Parent account"}</span>
              </span>
              <MoreHorizontal className="size-4 text-white/45" />
            </button>
          </DropdownMenuTrigger>
          <AccountMenuContent side="top" align="start" onRequestLogout={onRequestLogout} name={parent.name} />
        </DropdownMenu>
      </div>
    </aside>
  );
}

function AccountMenuContent({
  onRequestLogout,
  name,
  side,
  align,
}: {
  onRequestLogout: () => void;
  name: string;
  side: "top" | "bottom";
  align: "start" | "end";
}) {
  const { preference, setPreference } = useParentTheme();
  return (
    <DropdownMenuContent
      side={side}
      align={align}
      sideOffset={8}
      className="parent-ui min-w-60 rounded-2xl border-(--pp-line) bg-(--pp-surface) p-1.5 shadow-(--pp-shadow-lg)"
    >
      <DropdownMenuLabel className="px-2.5 py-2">
        <span className="pp-eyebrow block">Signed in as</span>
        <span className="mt-0.5 block truncate text-[13px] font-semibold text-(--pp-text)">{name}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-(--pp-line)" />
      {/* The desktop rail has its own switch; this covers the mobile account menu. */}
      <div className="lg:hidden">
        <DropdownMenuLabel className="pp-eyebrow px-2.5 pt-2 pb-1">Appearance</DropdownMenuLabel>
        {THEME_OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onSelect={() => setPreference(o.value)}
            className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-(--pp-text) focus:bg-(--pp-sunken) focus:text-(--pp-text)"
          >
            <o.icon className="size-4 text-(--pp-subtle)" />
            <span className="flex-1">{o.label}</span>
            {preference === o.value && <Check className="size-4 text-(--pp-iris)" aria-label="Selected" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-(--pp-line)" />
      </div>
      <DropdownMenuItem
        onSelect={onRequestLogout}
        className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-(--pp-absent) focus:bg-(--pp-absent-soft) focus:text-(--pp-absent)"
      >
        <LogOut className="size-4" />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

/* ─────────────────────────── Mobile top bar ─────────────────────────── */

export function ParentMobileTopBar({ onOpenPalette, onRequestLogout }: ShellActions) {
  const school = useSchool();
  const parent = useParentName();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-(--pp-line) bg-(--pp-surface)/85 px-3 backdrop-blur-xl lg:hidden">
      <img src={school.logo} alt={school.name} className="size-8 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <ChildSwitcher variant="bar" className="max-w-[240px]" />
      </div>
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Search"
        className="inline-flex size-10 items-center justify-center rounded-xl text-(--pp-muted) hover:bg-(--pp-text)/5"
      >
        <Search className="size-[18px]" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="pp-display inline-flex size-10 items-center justify-center rounded-full bg-(--pp-solid) text-[12px] font-semibold text-(--pp-solid-fg)"
          >
            {parent.initials}
          </button>
        </DropdownMenuTrigger>
        <AccountMenuContent side="bottom" align="end" onRequestLogout={onRequestLogout} name={parent.name} />
      </DropdownMenu>
    </header>
  );
}

/* ─────────────────────────── Mobile tab bar ─────────────────────────── */

export function ParentMobileTabBar() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Parent navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-(--pp-line) bg-(--pp-surface)/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 px-2">
        {PARENT_NAV.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className="relative flex h-16 flex-col items-center justify-center gap-1"
            >
              {active && (
                <motion.span
                  layoutId="tab-active"
                  transition={springy}
                  className="absolute top-2 h-8 w-14 rounded-full bg-(--pp-iris-soft)"
                />
              )}
              <item.icon className={cn("relative size-5", active ? "text-(--pp-iris)" : "text-(--pp-subtle)")} />
              <span className={cn("relative text-[11px] font-semibold", active ? "text-(--pp-text)" : "text-(--pp-subtle)")}>
                {item.short}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
