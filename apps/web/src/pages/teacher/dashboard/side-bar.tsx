import { NavLink, useLocation, useNavigate } from "react-router-dom";

import bluethub from "@/assets/png/bluethub.png";
import arrowMenu from "@/assets/svg/arrow_menu_close.svg";
import arrowMenuOpen from "@/assets/svg/arrow_menu_open.svg";
import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";
import { TACADEMIC_GROUPS } from "@/shared/constant";
import { localData } from "@/utils";
import type { NavItem } from "@/pages/admin/side-bar";
import settingsIcon from "@/assets/svg/settings.svg";
import logoutIcon from "@/assets/svg/logout.svg";
import dashboardIcon from "@/assets/svg/element-4.svg";
import calendarIcon from "@/assets/svg/calendar.svg";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { schoolInfo } from "@/services";

// Some sibling nav children point at the same pathname and differ only by a
// query string (e.g. "/teacher/module/quiz" vs "?view=topic" vs
// "?view=student") — NavLink's built-in isActive ignores the query string
// entirely, so all of them would highlight together. Match search params too.
function isChildPathActive(childPath: string, pathname: string, search: string): boolean {
  const [childPathname, childQuery = ""] = childPath.split("?");
  if (pathname !== childPathname) return false;
  if (!childQuery) return !search;
  const currentParams = new URLSearchParams(search);
  const childParams = new URLSearchParams(childQuery);
  for (const [key, value] of childParams) {
    if (currentParams.get(key) !== value) return false;
  }
  return true;
}

// ── Chevron Icon ──────────────────────────────────────────────────────────────
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.25s ease",
      flexShrink: 0,
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MAIN_LINKS: NavItem[] = [
  { name: "Dashboard", icons: dashboardIcon, path: "/teacher" },
  { name: "Calendar", icons: calendarIcon, path: "/calendar" },
];

const OTHER_LINKS: NavItem[] = [
  { name: "Settings", icons: settingsIcon, path: "/teacher/settings", disabled: true },
  { name: "Log Out", icons: logoutIcon, path: "/" },
];

function ProfileCard({ isCollapsed }: { isCollapsed: boolean }) {
  const { user } = useAuthContext()
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Teacher Name";
  const role = `${user?.roleName || "Teacher"}`;
  const roleData = user?.roleData;
  const classroomList = (roleData && isTeacherRoleData(roleData)) ? roleData.classrooms : [];
  const classroom = classroomList[0];
  const className = classroom?.className;
  const subjects = classroom?.subjects;
  const subjectNames = subjects?.slice(0, 2).map((s) => s.subjectName).filter(Boolean).join(" · ");
  // HeadTeachers can be assigned several classrooms with no per-classroom
  // subjects — surface all class names on the second line instead of
  // repeating classrooms[0]'s name (which is already shown as the badge).
  const allClassNames = classroomList.map((c) => c.className).filter(Boolean).join(" · ");
  const subject = subjectNames || (classroomList.length > 1 ? allClassNames : "");
  const classLabel = classroomList.length > 1
    ? `${classroomList.length} classes`
    : className
      ? ` ${className}`
      : "No class assigned";

  const getInitials = (name?: string) => {
    if (!name) return "";
    return name
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
  };

  // Usage
  const initials = getInitials(user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "WA"); // "Mrs. Adaeze Funmi" → "MA"

  if (isCollapsed) {
    return (
      <div className="flex justify-center py-2 px-2">
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 mb-1 rounded-xl bg-[#292382] p-2 text-white">
      <div className="flex items-start gap-2">
        <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold truncate">{name}</p>
          <p className="text-[9px] opacity-70 truncate">{role}</p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className="bg-white/20 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
          {classLabel}
        </span>
        <span className="text-[10px] opacity-70 truncate">{subject}</span>
      </div>
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ label, isCollapsed }: {
  label: string; isCollapsed: boolean
}) {
  if (isCollapsed) return <div className="my-1 border-t border-[#29238215]" />;
  return (
    <p className="px-3 mb-1 text-[9px] font-bold tracking-widest text-[#29238260] uppercase">
      {label}
    </p>
  );
}

// ── Nav Link Item ─────────────────────────────────────────────────────────────
function NavItem({
  link,
  isCollapsed,
  onNavigate,
  isOpen,
  onToggle,
  roleName,
}: {
  link: NavItem;
  isCollapsed: boolean;
  onNavigate?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
  roleName?: string;
}) {
  const location = useLocation();

  if (link.children) {
    const isParentDisabled = link.disabled;

    return (
      <div>
        <button
          type="button"
          onClick={isParentDisabled ? undefined : onToggle}
          disabled={isParentDisabled}
          aria-disabled={isParentDisabled}
          title={isParentDisabled ? "Coming soon" : undefined}
          className={[
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group",
            isParentDisabled
              ? "opacity-40 cursor-not-allowed text-[#292382]"
              : "cursor-pointer " + (isOpen ? "bg-[#292382] text-white" : "text-[#292382] hover:bg-[#29238210]"),
            isCollapsed ? "justify-center" : "justify-between",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <img
              src={link.icons}
              alt={link.name}
              className={`w-[18px] h-[18px] shrink-0 object-contain transition-all ${isOpen && !isParentDisabled ? "brightness-0 invert" : "opacity-60 group-hover:opacity-100"
                }`}
            />
            {!isCollapsed && (
              <span className={`text-xs font-medium truncate ${isOpen && !isParentDisabled ? "text-white" : "text-[#292382]"}`}>
                {link.name}
              </span>
            )}
          </div>
          {!isCollapsed && !isParentDisabled && (
            <span className={isOpen ? "text-white" : "text-[#292382] opacity-60"}>
              <ChevronIcon open={!!isOpen} />
            </span>
          )}
        </button>

        <div
          style={{ display: !isCollapsed && isOpen && !isParentDisabled ? "block" : "none" }}
          className="mt-1 ml-9 border-l-2 border-[#29238225] space-y-0.5"
        >
          {link.children.filter((child) => {
            if (!child.roles || child.roles.length === 0) return true;
            return roleName && child.roles.includes(roleName);
          }).map((child) => {
            if (child.disabled) {
              return (
                <div
                  key={child.name}
                  aria-disabled="true"
                  title="Coming soon"
                  className="block text-xs py-1.5 px-3 rounded-lg font-medium text-[#292382] opacity-40 cursor-not-allowed select-none"
                >
                  {child.name}
                </div>
              );
            }

            const isActive = isChildPathActive(child.path, location.pathname, location.search);
            return (
              <NavLink
                key={child.name}
                to={child.path}
                onClick={onNavigate}
                className={[
                  "block text-xs py-1.5 px-3 rounded-lg font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#292382] text-white"
                    : "text-[#292382] opacity-80 hover:opacity-100 hover:bg-[#29238212]",
                ].join(" ")}
              >
                {child.name}
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  }

  if (link.disabled) {
    return (
      <div
        aria-disabled="true"
        title="Coming soon"
        className={[
          "flex items-center gap-2.5 px-3 py-1.5 rounded-md group",
          "opacity-40 cursor-not-allowed select-none",
          isCollapsed ? "justify-center" : "",
        ].join(" ")}
      >
        <img
          src={link.icons}
          alt={link.name}
          className="w-[16px] h-[16px] shrink-0 object-contain opacity-60"
        />
        {!isCollapsed && (
          <span className="text-[11px] font-medium truncate text-[#292382]">
            {link.name}
          </span>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={link.path!}
      end={link.path === "/teacher"}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer group",
          isActive ? "bg-[#292382] text-white" : "text-[#292382] hover:bg-[#29238210]",
          isCollapsed ? "justify-center" : "",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <img
            src={link.icons}
            alt={link.name}
            className={`w-[16px] h-[16px] shrink-0 object-contain transition-all ${isActive ? "brightness-0 invert" : "opacity-60 group-hover:opacity-100"
              }`}
          />
          {!isCollapsed && (
            <span
              className={`text-[11px] font-medium truncate ${isActive ? "text-white" : "text-[#292382]"}`}
            >
              {link.name}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ── NavContent ────────────────────────────────────────────────────────────────
export interface NavContentProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  onNavigate?: () => void;
  onLogout: () => void;
}

export const NavContent = ({
  isCollapsed,
  //   setIsCollapsed,
  onNavigate,
  onLogout,
}: NavContentProps) => {
  const { user } = useAuthContext();
  const roleName = user?.roleName;
  const location = useLocation();

  // Whichever dropdown contains the current route — so landing on a deep
  // link (bookmark, refresh, back button) shows the section you're already
  // in instead of a sidebar with nothing expanded.
  const activeItemKey = useMemo(() => {
    for (const group of TACADEMIC_GROUPS) {
      for (const item of group.items) {
        if (!("children" in item) || !item.children) continue;
        const isActive = item.children.some(
          (child) => child.path.split("?")[0] === location.pathname,
        );
        if (isActive) return `${group.section}:${item.name}`;
      }
    }
    return null;
  }, [location.pathname]);

  const [openDropdownIndex, setOpenDropdownIndex] = useState<string | null>(activeItemKey);

  useEffect(() => {
    if (activeItemKey) setOpenDropdownIndex(activeItemKey);
  }, [activeItemKey]);

  const handleDropdownClick = (idx: string) => {
    if (isCollapsed) {
      return;
    }
    setOpenDropdownIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="flex flex-col gap-2 pb-4">
      {/* Profile card */}
      <ProfileCard isCollapsed={isCollapsed} />

      {/* MAIN MENU */}
      <section className="px-0">
        <SectionLabel label="Main Menu" isCollapsed={isCollapsed} />
        <div className="px-3 space-y-0.5">
          {MAIN_LINKS.map((link) => (
            <NavItem key={link.name} link={link} isCollapsed={isCollapsed} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-4 border-t border-[#29238215]" />

      {/* ACADEMIC — grouped by workflow area so dropdown vs single-link
          items read as coherent clusters instead of one flat list */}
      {TACADEMIC_GROUPS.map((group) => (
        <section key={group.section} className="px-0">
          <SectionLabel label={group.section} isCollapsed={isCollapsed} />
          <div className="px-3 space-y-0.5">
            {group.items.map((link) => {
              const itemIdx = `${group.section}:${link.name}`;
              return (
                <NavItem
                  key={link.name}
                  link={link}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                  isOpen={openDropdownIndex === itemIdx}
                  onToggle={() => handleDropdownClick(itemIdx)}
                  roleName={roleName}
                />
              );
            })}
          </div>
        </section>
      ))}

      {/* Divider */}
      <div className="mx-4 border-t border-[#29238215]" />

      {/* OTHER */}
      <section className="px-3 space-y-0.5">
        {OTHER_LINKS.map((link) => {
          const isLogout = link.name === "Log Out";
          const isDisabled = link.disabled;
          if (isDisabled) {
            return (
              <div
                key={link.name}
                aria-disabled="true"
                title="Coming soon"
                className="flex gap-3 text-xs py-1.5 px-3 rounded-lg font-medium text-[#292382] opacity-40 cursor-not-allowed select-none"
              >
                <img
                  src={link.icons}
                  alt={link.name}
                  className={`w-[18px] h-[18px] shrink-0 object-contain transition-all
                opacity-60 group-hover:opacity-100"
              }`}
                />
                {link.name}
              </div>
            );
          }
          return (
            <NavLink
              key={link.name}
              to={link.path!}
              onClick={isLogout ? onLogout : onNavigate}
              className={({ isActive }) =>
                [
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer group",
                  isLogout
                    ? "hover:bg-red-50"
                    : isActive
                      ? "bg-[#292382] text-white"
                      : "text-[#292382] hover:bg-[#29238210]",
                  isCollapsed ? "justify-center" : "",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <img
                    src={link.icons}
                    alt={link.name}
                    className={`w-[16px] h-[16px] shrink-0 object-contain ${isLogout
                      ? "opacity-80"
                      : isActive
                        ? "brightness-0 invert"
                        : "opacity-60 group-hover:opacity-100"
                      }`}
                  />
                  {!isCollapsed && (
                    <span
                      className={`text-[11px] font-medium ${isLogout ? "text-red-500" : isActive ? "text-white" : "text-[#292382]"
                        }`}
                    >
                      {link.name}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </section>
    </div>
  );
};

// ── TeacherSidebar ────────────────────────────────────────────────────────────
const TeacherSidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const school = localData.retrieve("schoolInfo") as schoolInfo


  useEffect(() => {
    const saved = localData.retrieve<boolean>("navVNextT");
    if (saved !== null) setIsCollapsed(saved);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localData.save("navVNextT", next);
      return next;
    });
  };


  const handleSetCollapsed = (v: boolean) => {
    setIsCollapsed(v);
    localData.save("navVNextT", v);
  };
  const handleLogout = () => {
    logout();
    navigate("/");
  };


  return (
    <aside
      className={[
        "h-full bg-white border-r border-[#29238210] flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "w-[68px]" : "w-[252px]",
      ].join(" ")}
    >
      {/* Header: logo + collapse toggle */}
      <div
        className={`flex items-center px-3 py-2 border-b border-[#29238210] shrink-0 ${isCollapsed ? "justify-center" : "justify-between"
          }`}
      >
        {!isCollapsed && (
          <img src={school.logoUrl || bluethub} alt={school.schoolName ||'bluetsch'} className="h-5 rounded-full shrink-0" />
        )}

        {!isCollapsed && (<h2 className="text-chestnut font-medium text-[10px]">{school.schoolName}</h2>)}
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#29238210] transition-colors shrink-0"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <img
            src={isCollapsed ? arrowMenuOpen : arrowMenu}
            alt="toggle"
            className="w-4 h-4"
          />
        </button>
      </div>

      {/* Scrollable nav */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-2
          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-[#29238230]"
      >
        <NavContent
          isCollapsed={isCollapsed}
          setIsCollapsed={handleSetCollapsed}
          onLogout={handleLogout}
        />
      </div>
    </aside>
  );
};

export default TeacherSidebar;

interface IMobileTeacherNav {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MobileTeacherNav = ({ isOpen, setIsOpen }: IMobileTeacherNav) => {
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const school = localData.retrieve("schoolInfo") as schoolInfo
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={[
          "lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={[
          "lg:hidden fixed top-0 left-0 z-50 h-full w-[272px] bg-white flex flex-col shadow-xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Header: logo + close */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#29238210] shrink-0">

          <img src={bluethub} alt="Bluethub" className="h-5" />
          <h2 className="text-chestnut font-medium text-[10px]">{school.schoolName}</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#29238210] text-[#292382] transition-colors"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable nav — reuses exact same NavContent as desktop */}
        <div
          className="flex-1 overflow-y-auto py-2
            [&::-webkit-scrollbar]:w-1
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-[#29238230]"
        >
          <NavContent
            isCollapsed={false}
            setIsCollapsed={() => { }}
            onNavigate={() => setIsOpen(false)}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </>
  );
}