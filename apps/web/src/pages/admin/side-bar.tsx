/**
 * SideBar.tsx — Bluethub Admin Navigation
 *
 * Features:
 *  - Collapsible desktop sidebar (persisted to localStorage)
 *  - Dropdown support for links with children (e.g. Registration)
 *  - Grouped sections with labels + active-route auto-expand
 *  - Mobile: full-screen slide-in drawer
 *  - Matches existing Bluethub color tokens (chestnut, #292382, etc.)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

// ─── Asset imports ────────────────────────────────────────────────────────────
import bluethub from "@/assets/logo/B_Transparent.png";
import arrowMenu from "@/assets/svg/arrow_menu_open.svg";
import arrowMenuOpen from "@/assets/svg/arrow_menu_close.svg";
import registrationIcon from "@/assets/svg/registration.svg";
import dashboardIcon from "@/assets/svg/element-4.svg";
import calendarIcon from "@/assets/svg/calendar.svg";
// import messageIcon from "@/assets/svg/message.svg";
// import UserPlus from "@/assets/svg/user_plus.svg";
import ShieldCheck from "@/assets/svg/shield_check.svg";
import analyticsIcon from "@/assets/svg/analytics.svg";
// import libraryIcon from "@/assets/svg/library.svg";
import lessonIcon from "@/assets/svg/lesson.svg";
import schoolBrandingIcon from "@/assets/svg/school-branding.svg";
import settingsIcon from "@/assets/svg/settings.svg";
import logoutIcon from "@/assets/svg/logout.svg";
import AttendanceIcon from "@/assets/svg/attendance.svg";
import assignmentIcon from "@/assets/svg/assignment.svg";
import AssessmentIcon from "@/assets/svg/assessment.svg";
import QuestionBankIcon from "@/assets/svg/question-bank.svg";
import ModuletIcon from "@/assets/svg/module.svg";
import PeopleIcon from "@/assets/svg/people.svg";
import { useAuthContext } from "@/contexts/auth-context";
import { localData } from "@/utils";
import type { schoolInfo } from "@/services";

// ─── Nav data ─────────────────────────────────────────────────────────────────

export interface NavChild {
    name: string;
    path: string;
    disabled?: boolean;
    roles?: string[];
}

export interface NavItem {
    name: string;
    icons: string;
    path?: string;
    children?: NavChild[];
    disabled?: boolean;
    /** Omitted = visible to every role the admin route guard already allows.
     * Set to restrict (e.g. `["SuperAdministrator"]`) for sensitive items. */
    roles?: string[];
}

/** Items (and dropdown children) whose `roles` doesn't include the current
 * user's `roleName` are dropped entirely — not just disabled — so e.g. a
 * plain Administrator never sees "Admin Permissions" in the nav at all. */
function visibleItems<T extends { roles?: string[] }>(items: T[], roleName?: string): T[] {
    return items.filter((item) => !item.roles || (!!roleName && item.roles.includes(roleName)));
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const MAIN_LINKS: NavItem[] = [
    { name: "Dashboard", icons: dashboardIcon, path: "/admin" },
    { name: "Analytics", icons: analyticsIcon, path: "/admin/analytics" },
    { name: "Attendance", icons: AttendanceIcon, path: "/admin/attendance-analytics" },
    { name: "Calendar", icons: calendarIcon, path: "/calendar" },
    // { name: "Message", icons: messageIcon, path: "/admin/message" },
];

// Grouped by workflow area — related entries (e.g. Admin Role / Admin
// Permissions / User Management) sit under one labeled section instead of
// scattered through a single flat list.
const NAV_GROUPS: NavGroup[] = [
    {
        label: "User Management",
        items: [
            {
                name: "Users",
                icons: registrationIcon,
                children: [
                    { name: "Student", path: "/admin/registration/student" },
                    { name: "Unlock User", path: "/admin/registration/student/unlock-user" },
                    { name: "Teacher", path: "/admin/registration/Teacher" },
                    { name: "Subject", path: "/admin/registration/courses" },
                    { name: "Class", path: "/admin/registration/class" },
                ],
            },
            {
                name: "Parents",
                icons: PeopleIcon,
                children: [
                    { name: "Create / Manage Parent", path: "/admin/registration/parent" },
                    { name: "Attach Student", path: "/admin/registration/parent/attach" },
                    { name: "Search Parents", path: "/admin/registration/parent/search" },
                    { name: "Enable Parent", path: "/admin/registration/parent/enable", disabled: true },
                ],
            },
            // { name: "Admin Role", path: "/admin/registration/admin", icons: UserPlus },
            { name: "Admin Permissions", path: "/admin/admin-permissions", icons: ShieldCheck, roles: ["SuperAdministrator"] },
        ],
    },
    {
        label: "Content",
        items: [
            // { name: "Library", icons: libraryIcon, path: "/admin/library" },
            { name: "Module", icons: ModuletIcon, path: "/admin/module" },
            { name: "Lesson Approval", icons: lessonIcon, path: "/admin/lesson-approval" },
            { name: "School Branding", icons: schoolBrandingIcon, path: "/admin/school-branding", roles: ["SuperAdministrator"] },
        ],
    },
    {
        label: "Performance",
        items: [
            {
                name: "Question Bank",
                icons: QuestionBankIcon,
                children: [
                    { name: "Browse Question Bank", path: "/admin/assessment/question-bank" },
                    { name: "Create Question", path: "/admin/assessment/create-question" },
                    { name: "Extract Question", path: "/admin/assessment/upload-scan" },
                    { name: "My Uploads", path: "/admin/assessment/my-uploads" },
                ],
            },
            {
                name: "Quiz",
                icons: assignmentIcon,
                children: [
                    { name: "Create Quiz", path: "/admin/assessment/generate-quiz" },
                    { name: "My Quizzes", path: "/admin/quiz" },
                    { name: "By Class", path: "/admin/quiz/class" },
                    { name: "By Subject", path: "/admin/quiz/subject" },
                    { name: "By Student", path: "/admin/quiz/student" },
                ],
            },
            {
                name: "Assessment",
                icons: AssessmentIcon,
                children: [
                    { name: "Create Assessment", path: "/admin/assessment/config" },
                    { name: "Manage Assessments", path: "/admin/assessment/manage" },
                    { name: "Assign to Students", path: "/admin/assessment/assign-student" },
                    { name: "Assessment Grading", path: "/admin/assessment/pending-grading" },
                    { name: "Exam Focus", path: "/admin/assessment/exam-focus" },
                    { name: "By Class", path: "/admin/assessment/class" },
                    { name: "By Subject", path: "/admin/assessment/subject" },
                    { name: "By Student", path: "/admin/assessment/student" },
                ],
            },
        ],
    },
];

const other_menu_Link: NavItem[] = [
    { name: "Settings", icons: settingsIcon, path: "/admin/settings", roles: ["SuperAdministrator"] },
    { name: "Log Out", icons: logoutIcon, path: "/" },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

export const ChevronIcon = ({ open }: { open: boolean }) => (
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

export const HamburgerIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

export const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
    if (isCollapsed) return <div className="my-2 border-t border-chestnut/15" />;
    return (
        <p className="px-3.5 mb-2 text-[10px] font-semibold tracking-[0.16em] text-chestnut/50 uppercase">
            {label}
        </p>
    );
}

// ─── Icon tile — gradient-filled "badge" with depth when active/open ────────
// This (not a left accent bar) is now the primary active-state signal — a
// flat chip at rest, a chestnut→forestBlue-light gradient with an inset
// highlight + drop shadow when active, giving real dimension in plain CSS.

function NavIconTile({ src, active, isLogout }: { src: string; active: boolean; isLogout?: boolean }) {
    if (isLogout) {
        return (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/50">
                <img src={src} alt="" aria-hidden="true" className="h-[15px] w-[15px] object-contain opacity-80" />
            </span>
        );
    }
    return (
        <span
            className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ease-out",
                active
                    ? "bg-gradient-to-br from-chestnut to-forestBlue-light shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_3px_8px_-2px_rgba(41,35,130,0.55)]"
                    : "bg-chestnut/10 group-hover:bg-chestnut/15",
            ].join(" ")}
        >
            <img
                src={src}
                alt=""
                aria-hidden="true"
                className={`h-[15px] w-[15px] object-contain transition-all duration-200 ${active ? "brightness-0 invert" : "opacity-80"
                    }`}
            />
        </span>
    );
}

// ─── A single, non-dropdown nav link (shared by every flat item) ─────────────

function PlainNavLink({
    link,
    isCollapsed,
    onNavigate,
    isLogout,
    onLogout,
}: {
    link: NavItem;
    isCollapsed: boolean;
    onNavigate?: () => void;
    isLogout?: boolean;
    onLogout?: () => void;
}) {
    return (
        <NavLink
            to={link.path!}
            end={link.path === "/admin"}
            onClick={isLogout ? onLogout : onNavigate}
            className={({ isActive }) =>
                [
                    "relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 ease-out cursor-pointer group",
                    isLogout
                        ? "hover:bg-red-50 dark:hover:bg-red-950"
                        : isActive
                            ? "bg-chestnut/10"
                            : "text-chestnut hover:bg-chestnut/[0.06]",
                    isCollapsed ? "justify-center" : "",
                ].join(" ")
            }
        >
            {({ isActive }) => (
                <>
                    <NavIconTile src={link.icons} active={isActive} isLogout={isLogout} />
                    {!isCollapsed && (
                        <span
                            className={`text-xs truncate transition-colors duration-200 ${isLogout
                                    ? "text-red-500 font-medium"
                                    : isActive
                                        ? "text-chestnut font-semibold"
                                        : "text-chestnut font-medium"
                                }`}
                        >
                            {link.name}
                        </span>
                    )}
                </>
            )}
        </NavLink>
    );
}

// ─── A dropdown nav item (icon + label + chevron, expandable children) ──────

function DropdownNavItem({
    link,
    isCollapsed,
    isOpen,
    onToggle,
    onNavigate,
}: {
    link: NavItem;
    isCollapsed: boolean;
    isOpen: boolean;
    onToggle: () => void;
    onNavigate?: () => void;
}) {
    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                className={[
                    "relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all duration-200 ease-out cursor-pointer group",
                    // Always has a faint tinted "container" look — even closed,
                    // it should read as something that expands, not a plain link.
                    isOpen
                        ? "bg-chestnut/10 border-chestnut/15"
                        : "text-chestnut border-chestnut/[0.08] bg-chestnut/[0.025] hover:bg-chestnut/[0.06] hover:border-chestnut/15",
                    isCollapsed ? "justify-center" : "justify-between",
                ].join(" ")}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <NavIconTile src={link.icons} active={isOpen} />
                    {!isCollapsed && (
                        <span className={`text-xs truncate transition-colors duration-200 ${isOpen ? "text-chestnut font-semibold" : "text-chestnut font-medium"}`}>
                            {link.name}
                        </span>
                    )}
                </div>
                {!isCollapsed && (
                    <span className="text-chestnut opacity-50">
                        <ChevronIcon open={isOpen} />
                    </span>
                )}
            </button>

            <div
                style={{ display: !isCollapsed && isOpen ? "block" : "none" }}
                className="mt-1 ml-9 border-l-2 border-chestnut/15 space-y-0.5"
            >
                {link.children?.map((child) => {
                    if (child.disabled) {
                        return (
                            <div
                                key={child.name}
                                aria-disabled="true"
                                title="Coming soon"
                                className="block text-xs py-1.5 px-3 rounded-lg font-medium text-chestnut opacity-40 cursor-not-allowed select-none"
                            >
                                {child.name}
                            </div>
                        );
                    }
                    return (
                        <NavLink
                            key={child.name}
                            to={child.path}
                            end
                            onClick={onNavigate}
                            className={({ isActive }) =>
                                [
                                    "block text-xs py-1.5 px-3 rounded-lg transition-all duration-150",
                                    isActive
                                        ? "bg-chestnut/10 text-chestnut font-semibold"
                                        : "text-chestnut font-medium opacity-80 hover:opacity-100 hover:bg-chestnut/[0.06]",
                                ].join(" ")
                            }
                        >
                            {child.name}
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Shared nav content ───────────────────────────────────────────────────────

export interface NavContentProps {
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean) => void;
    onNavigate?: () => void; // called after any navigation (closes mobile drawer)
    onLogout: () => void;
    /** Current user's `roleName` — items/groups whose `roles` doesn't
     * include it are filtered out entirely. */
    roleName?: string;
}

export const NavContent = ({ isCollapsed, setIsCollapsed, onNavigate, onLogout, roleName }: NavContentProps) => {
    const location = useLocation();

    const visibleGroups = useMemo(
        () =>
            NAV_GROUPS.map((group) => ({ ...group, items: visibleItems(group.items, roleName) })).filter(
                (group) => group.items.length > 0
            ),
        [roleName]
    );
    const visibleOtherLinks = useMemo(() => visibleItems(other_menu_Link, roleName), [roleName]);

    // Whichever dropdown contains the current route — so landing on a deep
    // link (bookmark, refresh, back button) shows the section you're already
    // in instead of a sidebar with nothing expanded.
    const activeItemKey = useMemo(() => {
        for (const group of visibleGroups) {
            for (const item of group.items) {
                if (!item.children) continue;
                const isActive = item.children.some((child) => child.path === location.pathname);
                if (isActive) return `${group.label}:${item.name}`;
            }
        }
        return null;
    }, [location.pathname, visibleGroups]);

    const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(activeItemKey);

    useEffect(() => {
        if (activeItemKey) setOpenDropdownKey(activeItemKey);
    }, [activeItemKey]);

    const handleDropdownClick = (key: string) => {
        if (isCollapsed) {
            // Expand sidebar first, then open dropdown
            setIsCollapsed(false);
            setOpenDropdownKey(key);
            return;
        }
        setOpenDropdownKey((prev) => (prev === key ? null : key));
    };

    return (
        <div className="flex flex-col gap-4 pb-4">
            {/* ── MAIN MENU ── */}
            <section className="px-3">
                <SectionLabel label="Main" isCollapsed={isCollapsed} />
                <div className="space-y-0.5">
                    {MAIN_LINKS.map((link) => (
                        <PlainNavLink key={link.name} link={link} isCollapsed={isCollapsed} onNavigate={onNavigate} />
                    ))}
                </div>
            </section>

            {/* ── GROUPED SECTIONS ── */}
            {visibleGroups.map((group) => (
                <section key={group.label} className="px-3">
                    <SectionLabel label={group.label} isCollapsed={isCollapsed} />
                    <div className="space-y-0.5">
                        {group.items.map((item) => {
                            if (item.children) {
                                const key = `${group.label}:${item.name}`;
                                return (
                                    <DropdownNavItem
                                        key={item.name}
                                        link={item}
                                        isCollapsed={isCollapsed}
                                        isOpen={openDropdownKey === key}
                                        onToggle={() => handleDropdownClick(key)}
                                        onNavigate={onNavigate}
                                    />
                                );
                            }
                            return (
                                <PlainNavLink key={item.name} link={item} isCollapsed={isCollapsed} onNavigate={onNavigate} />
                            );
                        })}
                    </div>
                </section>
            ))}

            {/* ── ACCOUNT ── */}
            <section className="px-3">
                <SectionLabel label="Account" isCollapsed={isCollapsed} />
                <div className="space-y-0.5">
                    {visibleOtherLinks.map((link) => {
                        const isLogout = link.name === "Log Out";
                        return (
                            <PlainNavLink
                                key={link.name}
                                link={link}
                                isCollapsed={isCollapsed}
                                onNavigate={onNavigate}
                                isLogout={isLogout}
                                onLogout={onLogout}
                            />
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

// ─── Desktop SideBar ──────────────────────────────────────────────────────────

const SideBar = () => {
    const navigate = useNavigate();
    const { logout, user } = useAuthContext();
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
    const school = localData.retrieve("schoolInfo") as schoolInfo;

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

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const handleSetCollapsed = (v: boolean) => {
        setIsCollapsed(v);
        localData.save("navVNextT", v);
    };

    const initials = (() => {
        const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
        if (!name) return "AD";
        return name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("");
    })();

    return (
        <aside
            className={[
                "h-full bg-background border-r border-chestnut/10 flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
                isCollapsed ? "w-[68px]" : "w-[252px]",
            ].join(" ")}
        >
            {/* Header */}
            <div
                className={`flex items-center px-4 py-5 border-b border-chestnut/10 shrink-0 ${isCollapsed ? "justify-center" : "justify-between"
                    }`}
            >
                {!isCollapsed && (
                    <div className="flex items-center gap-6 min-w-0">
                        <img src={school.logoUrl || bluethub} alt={school.schoolName ||'bluetsch'} className="h-7 w-auto shrink-0 rounded-sm dark:bg-white dark:p-0.5" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-chestnut/50 truncate">
                                {school?.schoolName ? school.schoolName : "BB"}
                            </p>
                            <p className="text-[13px] font-bold text-chestnut truncate">
                                {user?.roleName ? user.roleName : "Administrator"}
                            </p>
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={toggleSidebar}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-chestnut/10 active:scale-95 transition-all duration-150 shrink-0"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <img src={isCollapsed ? arrowMenuOpen : arrowMenu} alt="toggle" className="w-4 h-4" />
                </button>
            </div>

            {/* Profile card */}
            <div className={`px-3 pt-4 shrink-0 ${isCollapsed ? "flex justify-center" : ""}`}>
                {isCollapsed ? (
                    <div className="w-8 h-8 rounded-full bg-chestnut ring-2 ring-chestnut/15 shadow-sm flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {initials}
                    </div>
                ) : (
                    <div className="rounded-xl bg-gradient-to-br from-chestnut to-chestnut/85 px-3.5 py-3 flex items-center gap-3 shadow-lg shadow-chestnut/20">
                        <div className="w-9 h-9 rounded-full bg-white/15 ring-2 ring-white/25 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                                {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Admin User"}
                            </p>
                            <p className="text-[10px] text-white/60 truncate">{user?.emailAddress ?? ""}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Scrollable nav */}
            <div
                className="flex-1 overflow-y-auto overflow-x-hidden py-3
          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-chestnut/30"
            >
                <NavContent
                    isCollapsed={isCollapsed}
                    setIsCollapsed={handleSetCollapsed}
                    onLogout={handleLogout}
                    roleName={user?.roleName}
                />
            </div>
        </aside>
    );
};

// ─── Mobile Navigation (Drawer + FAB) ────────────────────────────────────────
interface IMobileNav {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MobileNav = ({ isOpen, setIsOpen }: IMobileNav) => {
    const navigate = useNavigate();
    const { logout, user } = useAuthContext();
    const drawerRef = useRef<HTMLDivElement>(null);
    const school = localData.retrieve("schoolInfo") as schoolInfo;

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
    }, [isOpen, setIsOpen]);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={[
                    "lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                ].join(" ")}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={[
                    "lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] bg-background flex flex-col shadow-xl transition-transform duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "-translate-x-full",
                ].join(" ")}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-4 py-5 border-b border-chestnut/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <img src={bluethub} alt="Bluethub" className="h-7 dark:bg-white dark:p-0.5 dark:rounded-sm" />
                        <div>
                            <p className="text-[10px] font-semibold text-chestnut/50">
                                {school?.schoolName ? school.schoolName : "BB"}
                            </p>
                            <p className="text-[13px] font-bold text-chestnut">
                                {user?.roleName ? user.roleName : "Administrator"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-chestnut/10 active:scale-95 text-chestnut transition-all duration-150"
                        aria-label="Close navigation"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Drawer nav */}
                <div
                    className="flex-1 overflow-y-auto py-3
            [&::-webkit-scrollbar]:w-1
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-chestnut/30"
                >
                    <NavContent
                        isCollapsed={false}
                        setIsCollapsed={() => { }}
                        onNavigate={() => setIsOpen(false)}
                        onLogout={handleLogout}
                        roleName={user?.roleName}
                    />
                </div>
            </div>
        </>
    );
};

export default SideBar;
