import { registerSW } from "virtual:pwa-register";
import { toast } from "@bluethub/ui-kit";

/**
 * Registers the service worker and wires up update detection.
 *
 * The app is installed to the home screen on mobile, so a user may never
 * fully close it — the old registration in main.tsx registered `/sw.js`
 * directly but never acted on `onupdatefound`, so a new worker finished
 * installing and then sat in "waiting" forever: it only takes control
 * (`skipWaiting`) once every open tab/instance is closed, which an
 * installed mobile app effectively never is. New features never appeared
 * until the user uninstalled and reinstalled.
 *
 * `virtual:pwa-register` gives us `updateSW`, which we call once the user
 * agrees to reload — that's what actually activates the waiting worker.
 */
export function registerPwaUpdates() {
  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    onNeedRefresh() {
      toast("A new version of Bluethub is available.", {
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => {
            void updateSW(true);
          },
        },
      });
    },
    onRegisterError(error) {
      console.error("Service worker registration failed:", error);
    },
  });

  // Installed mobile apps can stay open for days — poll periodically so a
  // waiting update surfaces even if the user never navigates/reloads.
  const CHECK_INTERVAL_MS = 30 * 60 * 1000;
  window.setInterval(() => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      registration?.update().catch(() => {});
    });
  }, CHECK_INTERVAL_MS);
}
