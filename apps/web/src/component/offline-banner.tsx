import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// Shown only while the device has no network at all (see useOnlineStatus —
// a slow/flaky connection still reads as "online" and renders nothing here).
const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-amber-700 text-xs font-medium">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      You're offline — only lessons you've already opened are available until you reconnect.
    </div>
  );
};

export default OfflineBanner;
