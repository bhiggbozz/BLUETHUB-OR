import { useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface SpeakToggleProps {
  name: string;
  canSpeak: boolean;
  /** Whether LiveKit currently reports this student as an active speaker. */
  isSpeaking?: boolean;
  onToggle: (allow: boolean) => void | Promise<void>;
  disabled?: boolean;
}

/** Teacher-only per-student mic allow/deny control. The actual permission is
 * enforced server-side (`appliedNow` on the response may be `false` if the
 * student isn't connected to audio yet — this just reflects the server's
 * last-known state, it doesn't guarantee an immediate effect). */
export default function SpeakToggle({ name, canSpeak, isSpeaking, onToggle, disabled }: SpeakToggleProps) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (disabled || pending) return;
    setPending(true);
    try {
      await onToggle(!canSpeak);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm">
      <span className="relative flex items-center">
        {isSpeaking && <span className="absolute inset-0 -m-1 animate-ping rounded-full bg-green-400/60" />}
        <span className={`relative size-2 rounded-full ${isSpeaking ? "bg-green-500" : "bg-slate-300"}`} />
      </span>
      <span className="text-sm font-medium text-slate-700">{name}</span>
      <button
        onClick={handleClick}
        disabled={disabled || pending}
        title={canSpeak ? "Mute this student" : "Let this student speak"}
        className={`flex size-7 items-center justify-center rounded-full transition-colors ${
          canSpeak ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
        } disabled:opacity-50`}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : canSpeak ? (
          <Mic className="size-3.5" />
        ) : (
          <MicOff className="size-3.5" />
        )}
      </button>
    </div>
  );
}
