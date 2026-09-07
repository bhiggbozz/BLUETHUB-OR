import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Provider } from "react-redux";
import { AxiosError } from "axios";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Replay from "@/component/reply";
import { store } from "@/store";
import boardSessionService from "@/services/board-session";
import { addAudio, addStrokes, deleteAudioBySession, deleteClassBySession } from "@/utils/db";
import type { AudioBatch, CompressedStroke, IActions } from "@/utils/constant";

// Parses a stroke's "MM:SS" / "HH:MM:SS" clock string (the live recording
// timer's display at draw time) into elapsed milliseconds.
function clockToMs(value: string | null | undefined): number {
  if (!value) return NaN;
  const parts = String(value).trim().split(":").map(Number);
  if (!parts.every(Number.isFinite)) return NaN;
  if (parts.length === 2) return Math.max(0, (parts[0] * 60 + parts[1]) * 1000);
  if (parts.length === 3) return Math.max(0, (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
  return NaN;
}

/**
 * Teacher-facing viewer for a student's study-group board recording, reviewed
 * before approving/rejecting their content submission.
 *
 * Reuses the same `Replay` player the teacher/student lesson-replay flow
 * uses (it only reads IndexedDB + localStorage["currentBatches"], keyed by
 * an arbitrary `sessionId` string — it has no idea this data came from a
 * different pipeline). The group-content manifest is a simpler shape than a
 * lesson session's: one continuous final audio file instead of many 60s
 * chunks, and no media assets/chapters, so unlike student-replay.tsx there's
 * no resumable download cache here — this is a single-use review viewer, not
 * an offline-capable lesson downloader.
 */
const GroupRecordingViewer = () => {
  const { groupId = "", studentId = "" } = useParams<{ groupId: string; studentId: string }>();
  const navigate = useNavigate();

  const sessionKey = `group-content_${groupId}_${studentId}`;

  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Loading recording...");
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!groupId || !studentId) {
      setError("Missing group or student id.");
      return;
    }

    let cancelled = false;

    const prepare = async () => {
      try {
        setStatusText("Downloading recording manifest...");
        setProgress(5);

        const manifest = await boardSessionService.getGroupContentManifest(groupId, studentId);
        if (!manifest) throw new Error("No recording manifest found for this student.");
        if (cancelled) return;

        // Clear any previously stored data for this exact recording so a
        // re-visit doesn't mix stale + fresh strokes/audio under the same key.
        await Promise.allSettled([
          deleteClassBySession(sessionKey),
          deleteAudioBySession(sessionKey),
        ]);

        const batches = [...(manifest.strokeBatches ?? [])].sort((a, b) => a.batchIndex - b.batchIndex);
        const totalItems = Math.max(1, batches.length + (manifest.audioFinalUrl ? 1 : 0));
        let done = 0;
        const allStrokes: CompressedStroke[] = [];

        for (const batch of batches) {
          if (cancelled) return;
          setStatusText(`Downloading board data ${batch.batchIndex + 1} / ${batches.length}...`);
          const fetched = await boardSessionService.getGroupContentBatch(groupId, studentId, batch.batchIndex);
          if (fetched?.strokes?.length) {
            const stamped = fetched.strokes.map((s) => ({ ...s, sessionId: sessionKey }));
            await addStrokes(stamped);
            allStrokes.push(...stamped);
          }
          done++;
          if (!cancelled) setProgress(Math.min(90, Math.round((done / totalItems) * 90)));
        }

        // Replay positions strokes primarily off a wall-clock anchor
        // (stroke.timestamp mapped against localStorage.sessionStartWallMs),
        // falling back to the stroke's own "MM:SS" clock string only when no
        // anchor is set. Rather than leave that anchor unset, derive it
        // directly from the strokes themselves: each one independently
        // implies an anchor (timestamp - its own elapsed clock time), so the
        // median across all of them gives a robust, self-consistent estimate
        // of when (in wall-clock terms) this recording's clock read 00:00.
        const anchorCandidates = allStrokes
          .map((s) => s.timestamp - clockToMs(s.startTime))
          .filter((v) => Number.isFinite(v))
          .sort((a, b) => a - b);
        const sessionStartWallMs = anchorCandidates.length > 0
          ? anchorCandidates[Math.floor(anchorCandidates.length / 2)]
          : 0;

        // A single continuous audio file spans the whole recording — unlike
        // the teacher flow's many per-minute chunks. Its wall-clock
        // "timestamp" (marking the batch's end, per Replay's convention) is
        // anchored to the same sessionStartWallMs as the strokes above, so
        // both timelines share one consistent reference frame.
        const totalDurationMs = Math.max(1, manifest.stats.totalDurationMs);
        if (manifest.audioFinalUrl) {
          if (cancelled) return;
          setStatusText("Downloading audio...");
          try {
            const res = await fetch(manifest.audioFinalUrl);
            if (res.ok) {
              const blob = await res.blob();
              const audioBatch: AudioBatch = {
                id: `${sessionKey}_audio_0`,
                type: "audio",
                sessionId: sessionKey,
                batchId: 0,
                timestamp: sessionStartWallMs + totalDurationMs,
                blob,
                duration: totalDurationMs / 1000,
                size: blob.size,
              };
              await addAudio(audioBatch);
            }
          } catch {
            // Non-fatal — replay opens board-only (silent) if audio can't be fetched.
          }
          done++;
          if (!cancelled) setProgress(95);
        }

        const boardDims = manifest.boards?.find(
          (b) => (b.dimensions?.width ?? 0) > 0 && (b.dimensions?.height ?? 0) > 0
        )?.dimensions;

        const actions: IActions = {
          totalDuration: totalDurationMs,
          totalBatches: batches.length,
          batches: [],
          boardSwitchTimeline: (manifest.boardSwitches ?? [])
            .map((s) => ({ timestampMs: s.timestampMs, toBoard: s.toBoard }))
            .sort((a, b) => a.timestampMs - b.timestampMs),
          recordedBoardDimensions: boardDims,
        };

        localStorage.setItem("currentBatches", JSON.stringify(actions));
        // Anchor both the stroke timeline and the audio batch to the same
        // reference frame (see the median calculation above) instead of
        // leaving it unset.
        localStorage.setItem("sessionStartWallMs", String(sessionStartWallMs));
        localStorage.setItem("sessionStartSessionId", sessionKey);
        // No per-batch timer head-start to correct for here (that's a
        // teacher-flow concept from resuming interrupted local sessions) —
        // pin both to 0 so Replay's clock-string fallback path (used only
        // when the wall-clock mapping disagrees) doesn't apply a stale
        // offset left over from a previous page's session.
        localStorage.setItem("recordingStartTimerMs", "0");
        localStorage.setItem("recordingStartSessionId", sessionKey);

        if (!cancelled) { setProgress(100); setIsReady(true); }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AxiosError && err.response?.status === 403) {
          setForbidden(true);
          return;
        }
        setError(
          err instanceof AxiosError
            ? err.response?.data?.responseMessage ?? err.message
            : err instanceof Error ? err.message : "Failed to load recording."
        );
      }
    };

    prepare();
    return () => {
      cancelled = true;
      deleteClassBySession(sessionKey).catch(() => {});
      deleteAudioBySession(sessionKey).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, studentId]);

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 px-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500" />
        <p className="text-sm font-semibold text-gray-700">You don't have access to this recording</p>
        <p className="text-xs text-gray-400 max-w-sm">
          Only the student who recorded it, the classroom's approver, or another group member (once approved) can view it.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-chestnut hover:opacity-70"
        >
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 px-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm font-semibold text-gray-700">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-chestnut hover:opacity-70"
        >
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 px-6 text-center">
        <Loader2 className="w-8 h-8 text-chestnut animate-spin" />
        <p className="text-sm font-medium text-gray-600">{statusText}</p>
        <div className="w-64 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-chestnut transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <Provider store={store}>
      <div className="h-screen flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to review
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <Replay sessionId={sessionKey} />
        </div>
      </div>
    </Provider>
  );
};

export default GroupRecordingViewer;
