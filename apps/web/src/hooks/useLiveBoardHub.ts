import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { LiveBoardHubClient, type LiveBoardHubStatus } from "@/services/live-board-hub";
import { setHubStatus } from "@/store/live-class-slice";

/**
 * Owns one `LiveBoardHubClient` for the lifetime of the mounting component
 * (the live-class room), keeps `hubStatus` in Redux in sync for any UI that
 * wants to show a connection badge, and surfaces hub exceptions as toasts
 * (per the hub contract: never let one crash the UI).
 *
 * Mount this once at the room root and pass `hub` down — it exposes
 * `connect(liveClassId)`, `disconnect()`, `on(event, handler)`,
 * `onSnapshot(handler)`, and the typed per-board send methods directly.
 */
export function useLiveBoardHub() {
  const dispatch = useDispatch();
  const clientRef = useRef<LiveBoardHubClient | null>(null);
  if (!clientRef.current) clientRef.current = new LiveBoardHubClient();

  const [status, setStatus] = useState<LiveBoardHubStatus>(clientRef.current.getStatus());

  useEffect(() => {
    const hub = clientRef.current!;
    const unsubStatus = hub.onStatusChange((next) => {
      setStatus(next);
      dispatch(setHubStatus(next));
    });
    const unsubError = hub.onError((message) => toast.error(message));

    return () => {
      unsubStatus();
      unsubError();
      void hub.disconnect();
    };
  }, [dispatch]);

  return { status, hub: clientRef.current };
}
