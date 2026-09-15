import type { RootState } from "@/store";
import { setPauseTime } from "@/store/class-action-slice";
import { Button } from "@bluethub/ui-kit";
import { useDispatch, useSelector } from "react-redux";
import { Play, Pause } from "lucide-react";
import EndClass from "@/pages/teacher/note-board/app-bottom/end-class";
import Audio from "./audio";
import toast from 'react-hot-toast';
import { useGlobalTimer } from "@/hooks/useGlobalTimer";
import { useSession } from "@/contexts/session-context";

const ClassBottom = () => {
    const dispatch = useDispatch();
    const timerElapsedSeconds = useSelector((state: RootState) => state.action.timerElapsedSeconds);
    const pauseTime = useSelector((state: RootState) => state.action.pauseTime);
    const sessionIdRef = useSelector((state: RootState) => state.action.sessionIdRef);
    const isRecording = useSelector((state: RootState) => state.action.isRecording);
    const timer = useGlobalTimer({});
    const { startRecording, continueSession, pauseRecording, resumeRecording } = useSession();

    const controlState: "start" | "pause" | "resume" = !pauseTime
        ? "pause"
        : (timerElapsedSeconds > 0 ? "resume" : "start");

    const controlLabel =
        controlState === "pause" ? "Pause" : controlState === "resume" ? "Resume" : "Start";

    const timeHanlder = async () => {
        if (!pauseTime) {
            //console.log('[ClassBottom] Pausing class');
            timer.pause();
            pauseRecording();
            dispatch(setPauseTime(true));
            toast.success('Class paused');
            return;
        }

        const isFirstStart = timerElapsedSeconds === 0;
        const isContinuingFromDraft = !isRecording && timerElapsedSeconds > 0 && sessionIdRef;

        if (isFirstStart) {
            //console.log('[ClassBottom] Starting class for first time');
            await startRecording();
            timer.start();
            dispatch(setPauseTime(false));
            toast.success('Class started — click mic to unmute');
        } else if (isContinuingFromDraft) {
            //console.log('[ClassBottom] Continuing from saved draft, sessionId:', sessionIdRef);
            const elapsedMs = Math.round(timerElapsedSeconds * 1000);
            const pausedMs = parseInt(localStorage.getItem('totalPausedMs') || '0', 10);
            await continueSession(sessionIdRef, elapsedMs, pausedMs);
            timer.start();
            dispatch(setPauseTime(false));
            toast.success('Recording continued — click mic to unmute');
        } else {
            //console.log('[ClassBottom] Resuming class');
            resumeRecording();
            timer.start();
            dispatch(setPauseTime(false));
            toast.success('Class resumed');
        }
    }

    // Button colors based on state
    const buttonStyles = {
        start: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-200",
        pause: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-200",
        resume: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-200",
    };

    return (
        <div className="
            relative z-50 pointer-events-auto
            flex flex-row md:flex-col items-center gap-2
            p-2.5
            rounded-xl
            bg-white/95 backdrop-blur-md
            md:border md:border-gray-200
            md:shadow-lg
        ">
            {/* Main Control Button */}
            <Button
                onClick={timeHanlder}
                title={controlLabel}
                aria-label={controlLabel}
                className={`
                    w-10 h-10
                    rounded-full
                    text-white
                    shadow-md
                    transition-all duration-200
                    hover:scale-105 active:scale-95
                    ${buttonStyles[controlState]}
                `}
            >
                <span className="flex items-center justify-center">
                    {controlState === "pause" ? (
                        <Pause className="w-4 h-4" fill="currentColor" />
                    ) : (
                        <Play className="w-4 h-4" fill="currentColor" />
                    )}
                </span>
            </Button>

            {/* Divider */}
            {/* <div className="w-8 h-px bg-gray-200" /> */}

            {/* End Class Button */}
            <EndClass />

            {/* Divider */}
            {/* <div className="w-8 h-px bg-gray-200" /> */}

            {/* Audio Control */}
            <Audio />
        </div>
    );
}

export default ClassBottom;
