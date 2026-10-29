import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PARENT_NAV } from "./nav-items";

const isTypingTarget = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

/**
 * Portal-wide shortcuts:
 *   ⌘K / Ctrl+K   open the command palette
 *   G then O/A/P  go to Overview / Attendance / Practice
 */
export function useParentHotkeys(openPalette: () => void) {
  const navigate = useNavigate();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector("[role=dialog]")) return;

      const key = e.key.toLowerCase();
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const target = PARENT_NAV.find((n) => n.hotkey === key);
        if (target) {
          e.preventDefault();
          navigate(target.path);
        }
        return;
      }
      if (key === "g") {
        pendingG.current = window.setTimeout(() => {
          pendingG.current = null;
        }, 900);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (pendingG.current !== null) window.clearTimeout(pendingG.current);
    };
  }, [navigate, openPalette]);
}
