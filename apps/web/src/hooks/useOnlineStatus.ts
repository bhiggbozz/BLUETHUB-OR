import { useSyncExternalStore } from "react";

// navigator.onLine reflects whether the network interface is present at all
// (airplane mode, no wifi/data) — it stays true through a slow or flaky
// connection, which is exactly the "offline vs. bad network" distinction we
// need: bad network is still "online" and should behave like any other
// request that might fail, not trigger offline mode.
function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
