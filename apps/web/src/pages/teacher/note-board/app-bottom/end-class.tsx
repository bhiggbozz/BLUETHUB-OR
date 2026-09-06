import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@bluethub/ui-kit";
import PhoneIcon from "@/assets/svg/phone.svg?react";
import { Upload, Trash2, X, AlertTriangle, Loader2, CheckCircle, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { setEndClass } from "@/store/class-action-slice";
import { useGlobalTimer } from "@/hooks/useGlobalTimer";
import { useSession } from "@/contexts/session-context";
import { useSessionUpload, type UploadResults } from "@/hooks/useSessionUpload";
import {
  boardSessionService,
  type SessionManifestPayload,
  type GroupContentManifestPayload,
} from "@/services/board-session";
import type { RootState } from "@/store";
import {
  getSession,
  updateSession,
  cleanupEntireSession,
  saveSessionAsDraft,
  getAudioChunksBySession,
  getStrokeBatchesBySession,
} from "@/utils/db";
import type { LocalSession, IActiveMedia } from "@/utils/constant";

type ModalState = "closed" | "confirm" | "discard-confirm" | "uploading" | "complete" | "error" | "draft-saved";

// A non-teacher caller (e.g. a student recording study-group content) stores
// where "exit"/"drafts" should land before entering the board, since this
// component has no route-scoped way to know its caller's context otherwise.
// Falls back to the teacher destinations so existing behavior is unchanged.
const getExitPath = () => sessionStorage.getItem("boardExitPath") || "/teacher";
const getDraftsPath = () => sessionStorage.getItem("boardDraftsPath") || "/teacher/drafts";
const isStudentBoard = () => sessionStorage.getItem("boardMode") === "student";

// Students get a hard cap on a single recording — teachers are unaffected
// (this only ever applies when boardMode === "student").
const STUDENT_MAX_RECORDING_SECONDS = 30 * 60;
const STUDENT_WARNING_AT_SECONDS = 25 * 60;

const EndClass = () => {
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

  // Token-based upload hook
  const { uploadSession, abort: abortUpload } = useSessionUpload();

  // Class hasn't started yet if no time has elapsed
  const classNotStarted = timerElapsedSeconds === 0;

  useEffect(() => {
    if (!isStudentBoard()) return;
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
      // Keep user on board route and show existing end-class options.
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
      toast.error("Class hasn't started yet");
      return;
    }
    setModalState("confirm");
  };

  const handleClose = () => {
    if (modalState === "uploading") {
      // Abort ongoing upload
      abortUpload();
    }
    setModalState("closed");
    setUploadProgress({ phase: "", current: 0, total: 0, percentage: 0 });
    setErrorMessage("");
  };

  const handleDiscard = async () => {
    setModalState("discard-confirm");
  };

  const handleConfirmDiscard = async () => {
    try {
      // Stop recording first
      stopRecording();
      dispatch(setEndClass());
      timer.stop();

      // Delete all local data
      if (sessionId) {
        await cleanupEntireSession(sessionId);
      }

      // Clear localStorage
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

  const handleSaveAsDraft = async () => {
    console.log("[SaveDraft] === STARTING SAVE AS DRAFT ===");
    console.log("[SaveDraft] Current sessionId from Redux:", sessionId);
    console.log("[SaveDraft] Timer elapsed seconds:", timerElapsedSeconds);

    try {
      // Stop recording first
      console.log("[SaveDraft] Step 1: Stopping recording...");
      stopRecording();
      dispatch(setEndClass());
      timer.stop();

      // Wait for worker to finalize - give it time to complete IDB writes
      console.log("[SaveDraft] Step 2: Waiting 2s for worker to finalize...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Use lesson/session ID for tracking consistency (no UUID fallback)
      const activeLessonRaw = sessionStorage.getItem("activeLesson");
      const parsedActiveLesson = activeLessonRaw ? JSON.parse(activeLessonRaw) as { lesson?: { id?: string }; id?: string } : null;
      const lessonScopedId = parsedActiveLesson?.lesson?.id || parsedActiveLesson?.id || null;
      const effectiveSessionId = sessionId || lessonScopedId;
      if (!effectiveSessionId) {
        throw new Error("Missing lesson ID for draft session");
      }
      const sessionStartWallMs = parseInt(localStorage.getItem('sessionStartWallMs') || '0', 10);
      const totalPausedMs = parseInt(localStorage.getItem('totalPausedMs') || '0', 10);
      const durationMs = timerElapsedSeconds * 1000;

      console.log("[SaveDraft] Step 3: Preparing session data");
      console.log("[SaveDraft]   - effectiveSessionId:", effectiveSessionId);
      console.log("[SaveDraft]   - sessionStartWallMs:", sessionStartWallMs);
      console.log("[SaveDraft]   - totalPausedMs:", totalPausedMs);
      console.log("[SaveDraft]   - durationMs:", durationMs);

      // Create session data object
      const sessionData: LocalSession = {
        id: effectiveSessionId,
        lessonId: effectiveSessionId,
        schoolId: "local",
        status: "draft",
        teacher: {
          id: "local",
          name: "Teacher",
          email: "",
        },
        lesson: {
          topic: `Draft Recording - ${new Date().toLocaleDateString()}`,
          subTopic: "",
          aim: "",
          subjectId: "",
          subjectName: "Unsaved Class",
          classroomId: "",
          className: "Local Recording",
        },
        recording: {
          startedAt: new Date(sessionStartWallMs || Date.now()).toISOString(),
          endedAt: new Date().toISOString(),
          totalDurationMs: durationMs,
          pausedDurationMs: totalPausedMs,
          deviceType: "desktop",
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        },
        totalAudioChunks: 0,
        totalStrokeBatches: 0,
        syncProgress: {
          audioSent: 0,
          audioFailed: 0,
          strokesSent: 0,
          strokesFailed: 0,
          manifestSent: false,
        },
        adjustments: {
          trimStartMs: 0,
          trimEndMs: 0,
          deletedSections: [],
          chapters: [],
        },
        mediaEvents: [],
        boardEvents: [],
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      // Use dedicated saveSessionAsDraft function with fresh DB connection
      // This avoids transaction conflicts with the worker's connection
      console.log("[SaveDraft] Step 4: Calling saveSessionAsDraft...");
      await saveSessionAsDraft(effectiveSessionId, sessionData);
      console.log("[SaveDraft] Step 5: Session saved successfully!");

      toast.success("Recording saved as draft");

      // Navigate directly to drafts page
      navigate(getDraftsPath());
      setModalState("closed");
    } catch (err) {
      // Log FULL error details
      console.error("[SaveDraft] ========== SAVE DRAFT FAILED ==========");
      console.error("[SaveDraft] Error object:", err);
      console.error("[SaveDraft] Error name:", err instanceof Error ? err.name : 'N/A');
      console.error("[SaveDraft] Error message:", err instanceof Error ? err.message : String(err));
      console.error("[SaveDraft] Error stack:", err instanceof Error ? err.stack : 'N/A');

      // Also try to get IndexedDB state for debugging
      try {
        const dbNames = await indexedDB.databases();
        console.error("[SaveDraft] Available databases:", dbNames);
      } catch (dbErr) {
        console.error("[SaveDraft] Could not list databases:", dbErr);
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save draft: ${errorMsg}`);
    }
  };

  const handleUpload = async () => {
    setModalState("uploading");
    setUploadProgress({ phase: "Preparing...", current: 0, total: 0, percentage: 0 });

    try {
      // Stop recording first
      await stopRecording();
      dispatch(setEndClass());
      timer.stop();

      // Wait for worker to finalize
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!sessionId) {
        throw new Error("No session ID");
      }

      // Use token-based upload service
      setUploadProgress({ phase: "Starting upload...", current: 0, total: 0, percentage: 0 });

      const results = await uploadSession(sessionId, {
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

      // Submit manifest to backend
      setUploadProgress({ phase: "Finalizing...", current: 0, total: 1, percentage: 95 });

      const session = await getSession(sessionId);

      if (session) {
        const groupId = sessionStorage.getItem("boardGroupId");
        if (groupId) {
          const groupManifest = await buildGroupContentManifest(session, results, groupId);
          await boardSessionService.submitGroupContentManifest(groupId, groupManifest);
        } else {
          const manifest = await buildManifest(session, results);
          await boardSessionService.submitManifest(sessionId, manifest);
        }

        // Update session status
        session.status = "published";
        session.syncProgress.manifestSent = true;
        await updateSession(session);
      }

      setUploadProgress({ phase: "Complete!", current: 1, total: 1, percentage: 100 });
      toast.success(isStudentBoard() ? "Recording uploaded successfully!" : "Lesson uploaded successfully!");
      allowExitRef.current = true;
      navigate(getExitPath());

    } catch (err) {
      console.error("Upload failed:", err);
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
      setModalState("error");
    }
  };

  // Build manifest from local session and upload results using actual IDB timing data
  const buildManifest = async (
    session: Awaited<ReturnType<typeof getSession>>,
    uploadResults: UploadResults
  ): Promise<SessionManifestPayload> => {
    if (!session) {
      throw new Error('Session not found');
    }

    const { audioUrls, strokeBatches: uploadedStrokeBatches } = uploadResults;

    // Use IDB mediaEvents; fall back to localStorage.currentBatches when empty.
    // localStorage.currentBatches is the live in-memory manifest from session.worker.ts
    // and is always up-to-date on the recording device.
    let mediaEvents: IActiveMedia[] = session.mediaEvents;
    if (mediaEvents.length === 0) {
      try {
        const raw = localStorage.getItem('currentBatches');
        if (raw) {
          const parsed = JSON.parse(raw) as { batches?: Array<{ mediaAction?: IActiveMedia[] }> };
          const collected: IActiveMedia[] = [];
          for (const batch of parsed.batches ?? []) {
            if (batch.mediaAction) collected.push(...batch.mediaAction);
          }
          if (collected.length > 0) mediaEvents = collected;
        }
      } catch { /* ignore parse errors */ }
    }

    // Fetch actual timing data from IDB
    const allAudioChunks = await getAudioChunksBySession(session.id);
    const allStrokeBatches = await getStrokeBatchesBySession(session.id);

    // Build a map of uploadBatchIndex → actual startMs/endMs from IDB audio chunks
    // Each upload batch (60s) covers 6 × 10s local chunks — take min startMs / max endMs
    const audioBatchTimings = new Map<number, { startMs: number; endMs: number; sizeBytes: number }>();
    for (const chunk of allAudioChunks) {
      const idx = chunk.uploadBatchIndex;
      const existing = audioBatchTimings.get(idx);
      audioBatchTimings.set(idx, {
        startMs: existing ? Math.min(existing.startMs, chunk.startMs) : chunk.startMs,
        endMs: existing ? Math.max(existing.endMs, chunk.endMs) : chunk.endMs,
        sizeBytes: (existing?.sizeBytes ?? 0) + chunk.sizeBytes,
      });
    }

    // Build a map of batchIndex → actual IDB stroke batch record
    const strokeBatchMap = new Map<number, typeof allStrokeBatches[0]>();
    for (const batch of allStrokeBatches) {
      strokeBatchMap.set(batch.batchIndex, batch);
    }

    // Build chunks array with actual timestamps and events
    const chunks = audioUrls.map((audio) => {
      const timing = audioBatchTimings.get(audio.chunkIndex);
      const startMs = timing?.startMs ?? audio.chunkIndex * 60000;
      const endMs = timing?.endMs ?? (audio.chunkIndex + 1) * 60000;
      const sizeBytes = timing?.sizeBytes ?? 150000;

      // Collect board/media events that fall within this audio chunk's time window
      const events: unknown[] = [];

      // Show events: emit in the chunk where showMs falls.
      mediaEvents.forEach(e => {
        const ms = e.showMs ?? 0;
        if (ms >= startMs && ms < endMs) {
          events.push({ type: 'media:show', timestampMs: ms, mediaAssetId: e.id });
        }
      });

      // Hide events: emit in the chunk where closedMs falls (can be a different chunk).
      mediaEvents.forEach(e => {
        const closedMs = e.closedMs;
        if (typeof closedMs === 'number' && closedMs > 0 &&
            closedMs >= startMs && closedMs < endMs) {
          events.push({ type: 'media:hide', timestampMs: closedMs, mediaAssetId: e.id });
        }
      });

      session.boardEvents
        .filter(e => e.timestampMs >= startMs && e.timestampMs < endMs)
        .forEach(e => {
          events.push({ type: 'board:switch', timestampMs: e.timestampMs, fromBoard: e.fromBoard, toBoard: e.toBoard });
        });

      (events as Array<{ timestampMs: number }>).sort((a, b) => a.timestampMs - b.timestampMs);

      return {
        index: audio.chunkIndex,
        startMs,
        endMs,
        audio: {
          url: audio.url,
          mediaId: audio.mediaId,
          sizeBytes,
          durationMs: endMs - startMs,
        },
        events,
      };
    });

    // Build stroke batches with actual timing from IDB
    const strokeBatchesManifest = uploadedStrokeBatches.map((uploaded) => {
      const idbBatch = strokeBatchMap.get(uploaded.batchIndex);
      return {
        id: uploaded.id,
        batchIndex: uploaded.batchIndex,
        indexKey: uploaded.indexKey,
        startMs: idbBatch?.startMs ?? uploaded.batchIndex * 60000,
        endMs: idbBatch?.endMs ?? (uploaded.batchIndex + 1) * 60000,
        strokeCount: idbBatch?.strokeCount ?? 0,
        sizeBytes: idbBatch?.sizeBytes ?? 5000,
      };
    });

    // Collect unique board indices from stroke data
    const boardIndices = new Set<number>();
    allStrokeBatches.forEach(b => b.strokes.forEach(s => boardIndices.add(s.currentBoard)));
    if (boardIndices.size === 0) boardIndices.add(0);

    const totalAudioSizeBytes = allAudioChunks
      .filter(c => c.syncStatus === 'sent')
      .reduce((sum, c) => sum + c.sizeBytes, 0);

    return {
      version: "2.0",
      session: {
        id: session.id,
        lessonId: session.lessonId,
        schoolId: session.schoolId,
        recordedAt: session.recording.startedAt,
        publishedAt: new Date().toISOString(),
        teacher: { id: session.teacher.id, name: session.teacher.name },
      },
      lesson: {
        topic: session.lesson.topic,
        subTopic: session.lesson.subTopic,
        aim: session.lesson.aim,
        subject: { id: session.lesson.subjectId, name: session.lesson.subjectName },
        classroom: { id: session.lesson.classroomId, name: session.lesson.className },
      },
      stats: {
        totalDurationMs: session.recording.totalDurationMs,
        totalDurationFormatted: formatDuration(session.recording.totalDurationMs),
        chunkCount: audioUrls.length,
        chunkDurationMs: 60000,
        seekGranularityMs: 10000,
        totalAudioSizeBytes,
        totalStrokeCount: allStrokeBatches.reduce((sum, b) => sum + b.strokeCount, 0),
        boardCount: boardIndices.size,
        strokeBatchCount: uploadedStrokeBatches.length,
      },
      chunks,
      strokeBatches: strokeBatchesManifest,
      mediaAssets: mediaEvents
        .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
        .map((m) => ({ id: m.id, name: m.name, type: m.type, url: m.url })),
      boards: Array.from(boardIndices).sort().map(index => ({
        index,
        dimensions: { width: session.recording.screenWidth, height: session.recording.screenHeight },
        strokeCount: allStrokeBatches.flatMap(b => b.strokes).filter(s => s.currentBoard === index).length,
      })),
      chapters: session.adjustments.chapters.map((c) => ({
        title: c.label,
        startMs: c.timestampMs,
        endMs: c.timestampMs,
      })),
    };
  };

  // Same shape as buildManifest, minus session/lesson/mediaAssets/chapters —
  // that metadata already lives on GroupLessonContent from the content-submit
  // step, not on the board recording itself.
  const buildGroupContentManifest = async (
    session: Awaited<ReturnType<typeof getSession>>,
    uploadResults: UploadResults,
    groupId: string
  ): Promise<GroupContentManifestPayload> => {
    if (!session) {
      throw new Error('Session not found');
    }

    const { strokeBatches: uploadedStrokeBatches } = uploadResults;

    const allAudioChunks = await getAudioChunksBySession(session.id);
    const allStrokeBatches = await getStrokeBatchesBySession(session.id);

    const strokeBatchMap = new Map<number, typeof allStrokeBatches[0]>();
    for (const batch of allStrokeBatches) {
      strokeBatchMap.set(batch.batchIndex, batch);
    }

    const strokeBatchesManifest = uploadedStrokeBatches.map((uploaded) => {
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
      stats: {
        totalDurationMs: session.recording.totalDurationMs,
        totalDurationFormatted: formatDuration(session.recording.totalDurationMs),
        chunkCount: 0,
        chunkDurationMs: 60000,
        seekGranularityMs: 10000,
        totalAudioSizeBytes,
        totalStrokeCount: allStrokeBatches.reduce((sum, b) => sum + b.strokeCount, 0),
        boardCount: boardIndices.size,
        strokeBatchCount: uploadedStrokeBatches.length,
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
        title={classNotStarted ? "Start recording first" : isStudentBoard() ? "Finish recording" : "End class"}
        className="size-10 cursor-pointer rounded-full bg-[#D92D25] text-white shadow-md transition-all duration-200 hover:bg-[#B61F19] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PhoneIcon className="size-5 text-white" />
      </Button>

      {/* Modal rendered via portal to escape parent positioning */}
      {modalState !== "closed" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalState === "confirm" && (isStudentBoard() ? "Finish Recording" : "End Class")}
                {modalState === "discard-confirm" && "Discard Recording?"}
                {modalState === "uploading" && "Uploading Lesson"}
                {modalState === "complete" && "Upload Complete"}
                {modalState === "error" && "Upload Failed"}
                {modalState === "draft-saved" && "Draft Saved"}
              </h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title={modalState === "uploading" ? "Cancel upload" : "Close"}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              {/* Confirm State */}
              {modalState === "confirm" && (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    What would you like to do with this recording?
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={handleUpload}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-blue-200 bg-blue-50 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-blue-600" />
                      <span className="font-medium text-blue-900">Upload</span>
                      <span className="text-xs text-blue-600 text-center">
                        Publish for students
                      </span>
                    </button>
                    <button
                      onClick={handleSaveAsDraft}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-amber-200 bg-amber-50 rounded-xl hover:border-amber-400 hover:bg-amber-100 transition-colors"
                    >
                      <Save className="w-8 h-8 text-amber-600" />
                      <span className="font-medium text-amber-900">Save Draft</span>
                      <span className="text-xs text-amber-600 text-center">
                        Upload later
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

              {/* Discard Confirm State */}
              {modalState === "discard-confirm" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Are you sure?</p>
                      <p className="text-sm text-red-700 mt-1">
                        All audio and board recordings will be permanently deleted. This action cannot be undone.
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

              {/* Uploading State */}
              {modalState === "uploading" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="font-medium text-gray-900">{uploadProgress.phase}</span>
                  </div>
                  {(uploadProgress.total > 0 || uploadProgress.percentage > 0) && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>
                          {uploadProgress.current} / {uploadProgress.total} chunks
                        </span>
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
                    <p className="text-sm text-gray-500">
                      Uploading via direct transfer...
                    </p>
                    <button
                      onClick={handleClose}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Complete State */}
              {modalState === "complete" && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  <p className="text-gray-600">
                    Your lesson has been uploaded and is now available for students.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Draft Saved State */}
              {modalState === "draft-saved" && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                      <Save className="w-10 h-10 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-gray-600">
                    Your recording has been saved as a draft. You can continue or upload it later.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => navigate(getDraftsPath())}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                    >
                      View Drafts
                    </button>
                  </div>
                </div>
              )}

              {/* Error State */}
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
                    Your recording is saved locally. You can try uploading again later from your lessons.
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

export default EndClass;
