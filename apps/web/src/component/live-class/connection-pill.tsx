import { Badge } from "@bluethub/ui-kit";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionPillProps {
  ok: boolean;
  label: string;
}

/** Shared connection-status pill for the live-class top bars — was
 * duplicated identically in both the teacher and student room files. */
export default function ConnectionPill({ ok, label }: ConnectionPillProps) {
  return (
    <Badge variant={ok ? "success" : "warning"} className="gap-1 font-medium">
      {ok ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
      {label}
    </Badge>
  );
}
