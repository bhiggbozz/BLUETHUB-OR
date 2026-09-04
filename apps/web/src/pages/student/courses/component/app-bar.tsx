import { useAuthContext } from "@/contexts/auth-context";
import { ArrowLeft, Bell, Menu } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";

function MyCourseAppBar({title}: {title: string}) {
   const {  user } = useAuthContext();
  const navigate = useNavigate();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();

  return (
    <div className="bg-[#4F61E8] px-5 py-3 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button className="text-white" onClick={() => {}}>
          <Menu size={22}  onClick={openMobileNav}/>
        </button>
        <button className="text-white lg:hidden" onClick={() => navigate(-1)}>
          <ArrowLeft size={20}/>
        </button>
        <span className="text-white font-semibold text-base">{title}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
        {/* Bell */}
        <button className="w-8 h-8 rounded-full bg-[#3a4fd4] flex items-center justify-center relative">
          <Bell size={16} className="text-white" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full" />
        </button>
      </div>
    </div>
  );
}

export default MyCourseAppBar;