import { useAuthContext } from "@/contexts/auth-context";
import type { SchoolInfo } from "@/services";
import { localData } from "@/utils";
import { Bell, Settings } from "lucide-react";

const AdminAppbar = () => {
  const { user } = useAuthContext();
  const today = new Date();

  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const schoolProfile = localData.retrieve("schoolInfo") as SchoolInfo | null;
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

  return (
    <>
      <div className="hidden w-full mx-auto border-0 bg-card rounded-lg md:flex h-[64px] justify-between items-center py-3 px-5">
        <section>
          <h2 className="font-poppins font-medium text-[13px] leading-tight text-chestnut ">
            Hello, <span className="font-semibold capitalize ">{user?.firstName},</span> Welcome Back!
          </h2>
        </section>
        <section className="flex justify-between gap-4 items-center md:hidden">
          <h2 className="font-semibold text-base leading-tight text-chestnut">
            {dayName},
            <span className="font-medium text-sm">
              {formattedDate}
            </span>
          </h2>
          <div className="w-[45.79px] h-[45.79px]  rounded-full">
            <img src={schoolProfile?.logoUrl} alt="" className=" bg-white border-2 border-chestnut  rounded-full  w-full h-full cursor-pointer" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground leading-none mb-0.5">{greeting()}</p>
            <h2 className="text-sm font-semibold text-foreground truncate">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-[11px] text-chestnut font-medium hidden sm:block">{formattedDate}</p>
          </div>
        </section>

        {/* Right: school info + actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Date (mobile) */}
          <p className="text-[10px] text-muted-foreground sm:hidden leading-tight text-right">
            {today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>

          {/* School name */}
          {schoolProfile?.schoolName && (
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-semibold text-foreground leading-tight">{schoolProfile.schoolName}</span>
              <span className="text-[10px] text-muted-foreground">{user?.roleName}</span>
            </div>
          )}

          {/* School logo */}
          {schoolProfile?.logoUrl ? (
            <img
              src={schoolProfile.logoUrl}
              alt="School logo"
              className="w-9 h-9 rounded-full object-cover border-2 border-chestnut/20 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-chestnut/10 flex items-center justify-center shrink-0">
              <span className="text-chestnut text-xs font-bold">
                {schoolProfile?.schoolName?.[0] ?? "S"}
              </span>
            </div>
          )}

          {/* Action icons */}
          <button className="w-8 h-8 rounded-full bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-full bg-muted hover:bg-accent hidden sm:flex items-center justify-center text-muted-foreground transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminAppbar;
