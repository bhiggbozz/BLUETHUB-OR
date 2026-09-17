import type { RootState } from "@/store";
import { setPauseTime } from "@/store/class-action-slice";
import { Button } from "@bluethub/ui-kit";
import { useDispatch, useSelector } from "react-redux";
import { Play, Pause } from "lucide-react";
import StudentEndClass from "./student-end-class";
import Audio from "@/layouts/teacher/class/component/audio";
import toast from 'react-hot-toast';
import { useGlobalTimer } from "@/hooks/useGlobalTimer";
import { useSession } from "@/contexts/session-context";

// Fork of layouts/teacher/class/component/class-bottom.tsx — identical
// controls (start/pause/resume, mic), pointed at StudentEndClass instead of
// the teacher's EndClass.
const StudentClassBottom = () => {
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
            timer.pause();
            pauseRecording();
            dispatch(setPauseTime(true));
            toast.success('Recording paused');
            return;
        }

        const isFirstStart = timerElapsedSeconds === 0;
        const isContinuingFromDraft = !isRecording && timerElapsedSeconds > 0 && sessionIdRef;

        if (isFirstStart) {
            await startRecording();
            timer.start();
            dispatch(setPauseTime(false));
            toast.success('Recording started — click mic to unmute');
        } else if (isContinuingFromDraft) {
            const elapsedMs = Math.round(timerElapsedSeconds * 1000);
            const pausedMs = parseInt(localStorage.getItem('totalPausedMs') || '0', 10);
            await continueSession(sessionIdRef, elapsedMs, pausedMs);
            timer.start();
            dispatch(setPauseTime(false));
            toast.success('Recording continued — click mic to unmute');
        } else {
            resumeRecording();
            timer.start();
            dispatch(setPauseTime(false));
            toast.success('Recording resumed');
        }
    }

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

            <StudentEndClass />

            <Audio />
        </div>
    );
}

export default StudentClassBottom;
