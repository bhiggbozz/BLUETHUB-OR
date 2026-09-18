import { useAuthContext } from "@/contexts/auth-context";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { CalendarCheck2, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import bluethub from "@/assets/png/bluethub.png";
import { localData } from "@/utils";
import type { schoolInfo } from "@/services";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", path: "/parent", icon: LayoutDashboard, end: true },
  { name: "Attendance", path: "/parent/attendance", icon: CalendarCheck2 },
];

function ParentNavContent({ onNavigate, onLogout }: { onNavigate?: () => void; onLogout: () => void }) {
  const { user } = useAuthContext();
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Parent";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="mx-3 mt-3 rounded-xl bg-chestnut p-3 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
            {initials || "P"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{name}</p>
            <p className="text-[10px] opacity-70">Parent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-chestnut/10 text-chestnut" : "text-slate-500 hover:bg-slate-50",
              ].join(" ")
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Log Out
        </button>
      </div>
    </div>
  );
}

const ParentSideBar = () => {
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const school = localData.retrieve("schoolInfo") as schoolInfo;

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  return (
    <aside className="hidden lg:flex flex-col w-[220px] h-full bg-white border-r border-slate-100 shrink-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <img src={school?.logoUrl || bluethub} alt={school?.schoolName || "Bluethub"} className="h-7 w-7 rounded-full object-cover shrink-0" />
        <span className="text-sm font-semibold text-[#12122A] truncate">{school?.schoolName || "Bluethub"}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ParentNavContent onLogout={handleLogout} />
      </div>
    </aside>
  );
};

export default ParentSideBar;

interface MobileParentNavProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MobileParentNav = ({ isOpen, setIsOpen }: MobileParentNavProps) => {
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const drawerRef = useRef<HTMLDivElement>(null);
  const school = localData.retrieve("schoolInfo") as schoolInfo;

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate("/auth", { replace: true });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <div
        aria-hidden="true"
        className={[
          "lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />
      <div
        ref={drawerRef}
        className={[
          "lg:hidden fixed top-0 left-0 z-50 h-full w-[260px] bg-white flex flex-col shadow-xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <img src={school?.logoUrl || bluethub} alt={school?.schoolName || "Bluethub"} className="h-7 w-7 rounded-full object-cover shrink-0" />
            <span className="text-sm font-semibold text-[#12122A] truncate">{school?.schoolName || "Bluethub"}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ParentNavContent onNavigate={() => setIsOpen(false)} onLogout={handleLogout} />
        </div>
      </div>
    </>
  );
};

export const ParentMobileMenuButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="lg:hidden text-[#12122A]" aria-label="Open navigation">
    <Menu className="w-5 h-5" />
  </button>
);
