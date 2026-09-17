import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@bluethub/ui-kit";
import PhoneIcon from "@/assets/svg/phone.svg?react";
import { Upload, Trash2, X, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { setEndClass } from "@/store/class-action-slice";
import { useGlobalTimer } from "@/hooks/useGlobalTimer";
import { useSession } from "@/contexts/session-context";
import { useStudentSessionUpload, type StudentUploadResults } from "@/hooks/useStudentSessionUpload";
import { boardSessionService, type GroupContentManifestPayload } from "@/services/board-session";
import type { RootState } from "@/store";
import {
  getSession,
  cleanupEntireSession,
  getAudioChunksBySession,
  getStrokeBatchesBySession,
} from "@/utils/db";

/**
 * Dedicated end-of-recording flow for a student's study-group board recording.
 * This is a deliberate fork of the teacher's EndClass (pages/teacher/note-board/app-bottom/end-class.tsx)
 * rather than a shared component gated by sessionStorage flags — a student
 * recording always targets the group-content endpoints and never needs the
 * "Save Draft" concept (drafts are a teacher lesson-authoring feature; a
 * student's board recording belongs to one specific already-created content
 * submission, so there's nothing to "save as draft" separately).
 */

type ModalState = "closed" | "confirm" | "discard-confirm" | "uploading" | "complete" | "error";

const getExitPath = () => sessionStorage.getItem("boardExitPath") || "/student/study-groups";

// Students get a hard cap on a single recording.
const STUDENT_MAX_RECORDING_SECONDS = 30 * 60;
const STUDENT_WARNING_AT_SECONDS = 25 * 60;

const StudentEndClass = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { stopRecording } = useSession();
  const sessionId = useSelector((state: RootState) => state.action.sessionIdRef);
  const timerElapsedSeconds = useSelector((state: RootState) => state.action.timerElapsedSeconds);

  const timer = useGlobalTimer({});

  const [modalState, setModalState] = useState<ModalState>("closed");
  const [uploadProgress, setUploadProgress] = useState({ phase: "", current: 0, total: 0, percentage: 0 });
  const [errorMessage, setErrorMessage] = useState("");
  const allowExitRef = useRef(false);
  const backGuardInstalledRef = useRef(false);
  const warnedAtLimitRef = useRef(false);
  const autoEndedAtLimitRef = useRef(false);

  const { uploadSession, abort: abortUpload } = useStudentSessionUpload();

  const classNotStarted = timerElapsedSeconds === 0;

  useEffect(() => {
    if (timerElapsedSeconds >= STUDENT_WARNING_AT_SECONDS && !warnedAtLimitRef.current) {
      warnedAtLimitRef.current = true;
      const minutesLeft = Math.max(0, Math.round((STUDENT_MAX_RECORDING_SECONDS - timerElapsedSeconds) / 60));
      toast(`${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left on this recording`, { icon: "⏱️" });
    }
    if (timerElapsedSeconds >= STUDENT_MAX_RECORDING_SECONDS && !autoEndedAtLimitRef.current && modalState === "closed") {
      autoEndedAtLimitRef.current = true;
      toast.error("30-minute recording limit reached — finish up below.");
      setModalState("confirm");
    }
  }, [timerElapsedSeconds, modalState]);

  useEffect(() => {
    if (classNotStarted || backGuardInstalledRef.current) return;

    const onPopState = () => {
      if (allowExitRef.current) return;
      window.history.pushState({ boardExitGuard: true }, "", window.location.href);
      setModalState((prev) => (prev === "uploading" ? prev : "confirm"));
    };

    window.history.pushState({ boardExitGuard: true }, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    backGuardInstalledRef.current = true;

    return () => {
      window.removeEventListener("popstate", onPopState);
      backGuardInstalledRef.current = false;
    };
  }, [classNotStarted]);

  const handleEndClick = () => {
    if (classNotStarted) {
      toast.error("Recording hasn't started yet");
      return;
    }
    setModalState("confirm");
  };

  const handleClose = () => {
    if (modalState === "uploading") abortUpload();
    setModalState("closed");
    setUploadProgress({ phase: "", current: 0, total: 0, percentage: 0 });
    setErrorMessage("");
  };

  const handleDiscard = async () => {
    setModalState("discard-confirm");
  };

  const handleConfirmDiscard = async () => {
    try {
      stopRecording();
      dispatch(setEndClass());
      timer.stop();

      if (sessionId) await cleanupEntireSession(sessionId);

      localStorage.removeItem("currentBatches");
      localStorage.removeItem("sessionStartWallMs");
      localStorage.removeItem("sessionStartSessionId");
      localStorage.removeItem("recordingStartTimerMs");
      localStorage.removeItem("recordingStartSessionId");

      toast.success("Recording discarded");
      allowExitRef.current = true;
      navigate(getExitPath());
      setModalState("closed");
    } catch (err) {
      console.error("Failed to discard:", err);
      toast.error("Failed to discard recording");
    }
  };

  const handleUpload = async () => {
    setModalState("uploading");
    setUploadProgress({ phase: "Preparing...", current: 0, total: 0, percentage: 0 });

    try {
      await stopRecording();
      dispatch(setEndClass());
      timer.stop();

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!sessionId) throw new Error("No session ID");

      const groupId = sessionStorage.getItem("boardGroupId");
      const contentId = sessionStorage.getItem("boardContentId");
      if (!groupId || !contentId) throw new Error("Missing group/content reference for this recording");

      setUploadProgress({ phase: "Starting upload...", current: 0, total: 0, percentage: 0 });

      const results = await uploadSession(sessionId, groupId, contentId, {
        concurrency: 2,
        onProgress: (state) => {
          const phaseLabel = state.phase === 'audio' ? 'Uploading audio...' :
                            state.phase === 'strokes' ? 'Uploading board data...' :
                            state.phase === 'complete' ? 'Complete!' : 'Preparing...';
          setUploadProgress({
            phase: phaseLabel,
            current: state.currentChunk,
            total: state.totalChunks,
            percentage: state.overallProgress,
          });
        },
      });

      if (!results.success) {
        throw new Error(results.errors.join('; ') || 'Upload failed');
      }

      setUploadProgress({ phase: "Finalizing...", current: 0, total: 1, percentage: 95 });

      const session = await getSession(sessionId);
      if (session) {
        const manifest = await buildGroupContentManifest(session, results, groupId, contentId);
        await boardSessionService.submitGroupContentManifest(groupId, contentId, manifest);
      }

      setUploadProgress({ phase: "Complete!", current: 1, total: 1, percentage: 100 });
      toast.success("Recording uploaded successfully!");
      allowExitRef.current = true;
      navigate(getExitPath());
    } catch (err) {
      console.error("Upload failed:", err);
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
      setModalState("error");
    }
  };

  const buildGroupContentManifest = async (
    session: Awaited<ReturnType<typeof getSession>>,
    uploadResults: StudentUploadResults,
    groupId: string,
    contentId: string
  ): Promise<GroupContentManifestPayload> => {
    if (!session) throw new Error('Session not found');

    const allAudioChunks = await getAudioChunksBySession(session.id);
    const allStrokeBatches = await getStrokeBatchesBySession(session.id);

    const strokeBatchMap = new Map<number, typeof allStrokeBatches[0]>();
    for (const batch of allStrokeBatches) strokeBatchMap.set(batch.batchIndex, batch);

    const strokeBatchesManifest = uploadResults.strokeBatches.map((uploaded) => {
      const idbBatch = strokeBatchMap.get(uploaded.batchIndex);
      return {
        batchIndex: uploaded.batchIndex,
        indexKey: uploaded.indexKey,
        startMs: idbBatch?.startMs ?? uploaded.batchIndex * 60000,
        endMs: idbBatch?.endMs ?? (uploaded.batchIndex + 1) * 60000,
        strokeCount: idbBatch?.strokeCount ?? 0,
        sizeBytes: idbBatch?.sizeBytes ?? 0,
      };
    });

    const boardIndices = new Set<number>();
    allStrokeBatches.forEach(b => b.strokes.forEach(s => boardIndices.add(s.currentBoard)));
    if (boardIndices.size === 0) boardIndices.add(0);

    const totalAudioSizeBytes = allAudioChunks
      .filter(c => c.syncStatus === 'sent')
      .reduce((sum, c) => sum + c.sizeBytes, 0);

    return {
      groupId,
      contentId,
      stats: {
        totalDurationMs: session.recording.totalDurationMs,
        totalDurationFormatted: formatDuration(session.recording.totalDurationMs),
        chunkCount: 0,
        chunkDurationMs: 60000,
        seekGranularityMs: 10000,
        totalAudioSizeBytes,
        totalStrokeCount: allStrokeBatches.reduce((sum, b) => sum + b.strokeCount, 0),
        boardCount: boardIndices.size,
        strokeBatchCount: uploadResults.strokeBatches.length,
      },
      strokeBatches: strokeBatchesManifest,
      boards: Array.from(boardIndices).sort().map(index => ({
        index,
        dimensions: { width: session.recording.screenWidth, height: session.recording.screenHeight },
        strokeCount: allStrokeBatches.flatMap(b => b.strokes).filter(s => s.currentBoard === index).length,
      })),
      boardSwitches: session.boardEvents.map(e => ({
        fromBoard: e.fromBoard,
        toBoard: e.toBoard,
        timestampMs: e.timestampMs,
      })),
      audioFinalUrl: null,
      audioChunks: uploadResults.audioUrls
        .slice()
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map((a) => ({ chunkIndex: a.chunkIndex, url: a.url, mediaId: a.mediaId })),
    };
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const progressPercent = uploadProgress.percentage > 0
    ? uploadProgress.percentage
    : (uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0);

  return (
    <>
      <Button
        onClick={handleEndClick}
        disabled={classNotStarted}
        title={classNotStarted ? "Start recording first" : "Finish recording"}
        className="size-10 cursor-pointer rounded-full bg-[#D92D25] text-white shadow-md transition-all duration-200 hover:bg-[#B61F19] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PhoneIcon className="size-5 text-white" />
      </Button>

      {modalState !== "closed" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalState === "confirm" && "Finish Recording"}
                {modalState === "discard-confirm" && "Discard Recording?"}
                {modalState === "uploading" && "Uploading Recording"}
                {modalState === "complete" && "Upload Complete"}
                {modalState === "error" && "Upload Failed"}
              </h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title={modalState === "uploading" ? "Cancel upload" : "Close"}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5">
              {modalState === "confirm" && (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    What would you like to do with this recording?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleUpload}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-blue-200 bg-blue-50 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-blue-600" />
                      <span className="font-medium text-blue-900">Submit</span>
                      <span className="text-xs text-blue-600 text-center">
                        Save & attach to your content
                      </span>
                    </button>
                    <button
                      onClick={handleDiscard}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 bg-gray-50 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors group"
                    >
                      <Trash2 className="w-8 h-8 text-gray-400 group-hover:text-red-500" />
                      <span className="font-medium text-gray-700 group-hover:text-red-700">Discard</span>
                      <span className="text-xs text-gray-500 group-hover:text-red-500 text-center">
                        Delete recording
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {modalState === "discard-confirm" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Are you sure?</p>
                      <p className="text-sm text-red-700 mt-1">
                        Your audio and board recording will be permanently deleted. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalState("confirm")}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleConfirmDiscard}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Yes, Delete Everything
                    </button>
                  </div>
                </div>
              )}

              {modalState === "uploading" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="font-medium text-gray-900">{uploadProgress.phase}</span>
                  </div>
                  {(uploadProgress.total > 0 || uploadProgress.percentage > 0) && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{uploadProgress.current} / {uploadProgress.total} chunks</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Uploading via direct transfer...</p>
                    <button onClick={handleClose} className="text-sm text-red-600 hover:text-red-700 font-medium">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {modalState === "complete" && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  <p className="text-gray-600">
                    Your recording has been saved and submitted for approval.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {modalState === "error" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Upload Failed</p>
                      <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Your recording is saved locally. You can try uploading again later.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleUpload}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default StudentEndClass;
