;
import StudentSideBar, { MobileStudentNav } from "@/pages/student/component/side-bar";
import OfflineBanner from "@/component/offline-banner";
import { useState } from "react";
import { Outlet } from "react-router-dom";

const StudentsLayout = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(79,97,232,0.14),_transparent_28%),linear-gradient(180deg,_#f5f7ff_0%,_#eef3ff_52%,_#f8fafc_100%)]">
      <div className="hidden lg:flex h-full">
        <StudentSideBar />
      </div>
      <div>
        <MobileStudentNav isOpen={mobileNavOpen} setIsOpen={setMobileNavOpen} />
      </div>
      <div className="flex-1 h-screen overflow-y-auto flex flex-col">
        <OfflineBanner />
        <div className="flex-1 px-2 py-2 md:px-3 md:py-3 lg:px-3">
          <Outlet context={{ openMobileNav: () => setMobileNavOpen(true) }} />
        </div>
      </div>
    </div>
  );
};

export default StudentsLayout;
