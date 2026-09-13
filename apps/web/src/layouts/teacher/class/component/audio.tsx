import { useEffect, useRef } from "react";
import { Button } from "@bluethub/ui-kit";
import OffMicIcon from "@/assets/svg/off-mic.svg?react";
import MicIcon from "@/assets/svg/mic.svg?react";
import { useSession } from "@/contexts/session-context";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import toast from "react-hot-toast";
import { MicOff } from "lucide-react";

const MIC_MUTE_REMINDER_INTERVAL = 5000; // 5 seconds

const Audio = () => {
  const { isRecording, isMicMuted, muteMic, unmuteMic } = useSession();
  const reminderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const classEnded = useSelector((state: RootState) => state.action.classEnded);
  const pauseTime = useSelector((state: RootState) => state.action.pauseTime);
  const timerElapsedSeconds = useSelector((state: RootState) => state.action.timerElapsedSeconds);

  // Class hasn't started yet when recording is not active.
  // Relying on timerElapsedSeconds can keep mic disabled during the first tick.
  const classNotStarted = !isRecording;

  // Mic is unmuted when recording is active and mic is not muted
  const isMicUnmuted = isRecording && !isMicMuted;

  // Class is actively running (not paused, not ended, has started)
  const classIsActive = isRecording && !pauseTime && !classEnded && timerElapsedSeconds > 0;

  // Show periodic reminder when mic is muted during active class
  useEffect(() => {
    // Clear any existing interval
    if (reminderIntervalRef.current) {
      clearInterval(reminderIntervalRef.current);
      reminderIntervalRef.current = null;
    }

    // Only start reminder if class is active and mic is muted
    if (classIsActive && !isMicUnmuted) {
      reminderIntervalRef.current = setInterval(() => {
        toast((t) => (
          <div className="flex items-center gap-2">
            <MicOff className="size-4 text-amber-600" />
            <span className="text-sm">Your mic is muted</span>
            <button
              onClick={() => {
                unmuteMic();
                toast.dismiss(t.id);
                toast.success("Mic unmuted");
              }}
              className="ml-2 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
            >
              Unmute
            </button>
          </div>
        ), {
          duration: 4000,
          icon: null,
          style: {
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
          },
        });
      }, MIC_MUTE_REMINDER_INTERVAL);
    }

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    };
  }, []);

  const handleMic = () => {
    if (classEnded) {
      toast.error("Class has already ended");
      return;
    }

    if (classNotStarted) {
      toast.error("Please start the class first");
      return;
    }

    if (isMicUnmuted) {
      muteMic();
      toast.success("Mic muted");
      return;
    }

    unmuteMic();
    toast.success("Mic unmuted");
  };

  return (
    <div className="relative flex items-center justify-center">

      <Button
        onClick={handleMic}
        disabled={classEnded || classNotStarted}
        title={classNotStarted ? "Start recording first" : isMicUnmuted ? "Mute mic" : "Unmute mic"}
        className="size-10 cursor-pointer rounded-full bg-white text-[#1EE23E] shadow-md transition-all duration-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!isMicUnmuted ? (
          <OffMicIcon className="size-4" />
        ) : (
          <MicIcon className="size-4" />
        )}
      </Button>
    </div>
  );
};

export default Audio;