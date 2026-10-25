import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useAuthContext } from "@/contexts/auth-context";
import ParentSideBar, { ParentMobileTabBar, ParentMobileTopBar } from "../side-bar";
import { pageTransition } from "../ui/motion";
import { CommandPalette } from "./command-palette";
import { LogoutDialog } from "./logout-dialog";
import { useParentHotkeys } from "./use-hotkeys";
import { ParentThemeProvider } from "./theme";
import "../../theme/parent.css";

/** Frame for every /parent page: theme, rail, mobile bars, palette, transitions. */
export function ParentShell() {
  return (
    <ParentThemeProvider>
      <ShellFrame />
    </ParentThemeProvider>
  );
}

function ShellFrame() {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const requestLogout = useCallback(() => setLogoutOpen(true), []);
  useParentHotkeys(openPalette);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const confirmLogout = () => {
    setLogoutOpen(false);
    logout();
    navigate("/auth", { replace: true });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="parent-ui flex h-dvh overflow-hidden bg-(--pp-canvas)">
        <ParentSideBar onOpenPalette={openPalette} onRequestLogout={requestLogout} />

        <div ref={scrollRef} className="pp-canvas pp-scroll-thin relative flex-1 overflow-x-hidden overflow-y-auto">
          <div aria-hidden className="pp-grid-fade pointer-events-none absolute inset-x-0 top-0 h-[22rem]" />
          <ParentMobileTopBar onOpenPalette={openPalette} onRequestLogout={requestLogout} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pathname}
              variants={pageTransition}
              initial="initial"
              animate="enter"
              exit="exit"
              className="relative mx-auto w-full max-w-[1180px] px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10 lg:pb-14"
            >
              {outlet}
            </motion.main>
          </AnimatePresence>
        </div>

        <ParentMobileTabBar />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onLogout={requestLogout} />
      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={confirmLogout} />
    </MotionConfig>
  );
}
