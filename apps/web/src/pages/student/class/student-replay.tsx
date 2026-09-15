import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { Loader2, AlertCircle } from "lucide-react";
import Replay from "@/component/reply";
import { markLessonWatched } from "@/utils/watched-lessons";
import studentService from "@/services/student";
import { store } from "@/store";
import boardSessionService from "@/services/board-session";
import type { SessionManifestPayload } from "@/services/board-session";
import {
  addAudio,
  addStrokes,
  deleteAudioBySession,
  deleteAudioById,
  deleteClassBySession,
  getAudioBySession,
  getClassBySession,
  getReplayDownloadCache,
  saveReplayDownloadCache,
  deleteReplayDownloadCache,
  freeDiskSpace,
  isStorageFullError,
} from "@/utils/db";
import type { AudioBatch, IActions, IBatch } from "@/utils/constant";
import type { MediaType } from "@/utils/constant";
import { LESSON_MEDIA_CACHE, buildLessonScopedCacheKey } from "@/utils/lesson-media-cache";

// ── Helpers (same as WatchClass) ─────────────────────────────────────────────

const toMmSs = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const ss = (totalSec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

const clockToMs = (value: string | null | undefined): number => {
  if (!value) return NaN;
  const parts = String(value).trim().split(":").map(Number);
  if (!parts.every(Number.isFinite)) return NaN;
  if (parts.length === 2) return Math.max(0, (parts[0] * 60 + parts[1]) * 1000);
  if (parts.length === 3) return Math.max(0, (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
  return NaN;
};

interface ManifestChunkEvent {
  type: string;
  timestampMs: number;
  mediaAssetId?: string;
  frameIndex?: 0 | 1;
  fromBoard?: number | null;
  toBoard?: number | null;
}

const buildReplayBatches = (manifest: SessionManifestPayload): IActions => {
  const sortedChunks = [...manifest.chunks].sort((a, b) => a.startMs - b.startMs);
  const batches: IBatch[] = sortedChunks.map((chunk, idx) => ({
    id: `batch-${idx}`,
    startTime: toMmSs(chunk.startMs),
    endTime: toMmSs(chunk.endMs),
    hasAudio: true,
    hasBoard: true,
    mediaAction: [],
  }));

  const assetById = new Map(manifest.mediaAssets.map((asset) => [asset.id, asset] as const));
  const openMedia = new Map<string, {
    id: string; name: string; url: string; type: MediaType;
    show: string; showMs: number; frameIndex?: 0 | 1;
  }>();

  const attachToBatch = (media: {
    id: string; name: string; url: string; type: MediaType;
    show: string; closed: string; showMs: number; closedMs: number; frameIndex?: 0 | 1;
  }) => {
    const idx = sortedChunks.findIndex(
      (c) => media.showMs >= c.startMs && media.showMs < c.endMs
    );
    const batchIdx = idx >= 0 ? idx : Math.max(0, sortedChunks.length - 1);
    batches[batchIdx].mediaAction = [...(batches[batchIdx].mediaAction ?? []), media];
  };

  const totalDurationMs = Math.max(
    manifest.stats.totalDurationMs,
    sortedChunks.length > 0 ? sortedChunks[sortedChunks.length - 1].endMs : 0
  );

  // If the manifest stores event timestamps as absolute wall-clock ms (like
  // stroke.timestamp), convert them to session-relative ms before use.
  const sessionStartForEvents = manifest.session?.recordedAt
    ? new Date(manifest.session.recordedAt).getTime()
    : 0;
  const ABSOLUTE_TS_THRESHOLD = 1_000_000_000_000; // year 2001+
  const toRelativeMs = (rawMs: number): number => {
    if (sessionStartForEvents > 0 && rawMs > ABSOLUTE_TS_THRESHOLD) {
      return Math.max(0, rawMs - sessionStartForEvents);
    }
    return Math.max(0, rawMs);
  };

  // ── Board switches — merge three sources ────────────────────────────────────
  // 1. manifest.boardSwitches (top-level, server-aggregated)
  // 2. strokeBatches[N].boardSwitches (per-batch, client-submitted)
  // 3. chunks[N].events type=board:switch (most complete — covers every chunk
  //    even when no corresponding stroke batch was submitted for that window)
  // Dedup by exact timestampMs (first-write wins).
  const switchSet = new Map<number, number>(); // timestampMs → toBoard
  for (const s of manifest.boardSwitches ?? []) {
    switchSet.set(toRelativeMs(s.timestampMs), s.toBoard);
  }
  for (const batch of manifest.strokeBatches ?? []) {
    for (const s of batch.boardSwitches ?? []) {
      const t = toRelativeMs(s.timestampMs);
      if (!switchSet.has(t)) switchSet.set(t, s.toBoard);
    }
  }
  // Server now returns board:switch events with fromBoard/toBoard in chunk events.
  // This is the only place switches that fall after the last stroke batch appear.
  for (const chunk of sortedChunks) {
    const chunkEvents = (chunk.events as ManifestChunkEvent[] | undefined) ?? [];
    for (const e of chunkEvents) {
      if (e.type !== 'board:switch' || e.toBoard == null) continue;
      const t = toRelativeMs(e.timestampMs);
      if (!switchSet.has(t)) switchSet.set(t, e.toBoard);
    }
  }
  const boardSwitchTimeline: Array<{ timestampMs: number; toBoard: number }> =
    Array.from(switchSet.entries())
      .map(([timestampMs, toBoard]) => ({ timestampMs, toBoard }))
      .sort((a, b) => a.timestampMs - b.timestampMs);

  // ── Media events from chunk events ───────────────────────────────────────
  for (const chunk of sortedChunks) {
    const events = ((chunk.events as ManifestChunkEvent[] | undefined) ?? [])
      .filter((e) => Number.isFinite(e.timestampMs))
      .sort((a, b) => a.timestampMs - b.timestampMs);

    for (const event of events) {
      if (!event.mediaAssetId) continue;
      const asset = assetById.get(event.mediaAssetId);
      if (!asset) continue;

      const relativeMs = toRelativeMs(event.timestampMs);

      if (event.type === "media:show") {
        openMedia.set(event.mediaAssetId, {
          id: asset.id, name: asset.name, url: asset.url,
          type: asset.type as MediaType,
          show: toMmSs(relativeMs), showMs: relativeMs,
          frameIndex: event.frameIndex,
        });
      } else if (event.type === "media:hide") {
        const active = openMedia.get(event.mediaAssetId);
        if (!active) continue;
        attachToBatch({
          ...active, closed: toMmSs(relativeMs), closedMs: relativeMs,
        });
        openMedia.delete(event.mediaAssetId);
      }
    }
  }

  for (const active of openMedia.values()) {
    attachToBatch({
      ...active, closed: toMmSs(totalDurationMs), closedMs: totalDurationMs,
    });
  }

  // Fallback: if the server didn't return any media:show events but the session
  // has media assets, show them from the session midpoint. This avoids blocking
  // the board at t=0 while still making media visible during replay.
  const hasAnyMediaEvents = batches.some((b) => (b.mediaAction?.length ?? 0) > 0);
  if (!hasAnyMediaEvents && manifest.mediaAssets.length > 0 && sortedChunks.length > 0) {
    const fallbackShowMs = Math.floor(totalDurationMs / 2);
    for (const asset of manifest.mediaAssets) {
      attachToBatch({
        id: asset.id, name: asset.name, url: asset.url,
        type: asset.type as MediaType,
        show: toMmSs(fallbackShowMs), closed: toMmSs(totalDurationMs),
        showMs: fallbackShowMs, closedMs: totalDurationMs,
      });
    }
  }

  return {
    totalDuration: totalDurationMs,
    totalBatches: batches.length,
    batches,
    boardSwitchTimeline: boardSwitchTimeline.length > 0 ? boardSwitchTimeline : undefined,
    // Pass the teacher's recording dimensions so the replay player can scale
    // strokes proportionally onto any display size (mobile, tablet, laptop).
    recordedBoardDimensions: (() => {
      const b = manifest.boards?.find(
        (bd) => (bd.dimensions?.width ?? 0) > 0 && (bd.dimensions?.height ?? 0) > 0
      );
      return b ? { width: b.dimensions.width, height: b.dimensions.height } : undefined;
    })(),
  };
};

// ── Component ─────────────────────────────────────────────────────────────────

interface LocationState { sessionId?: string; lessonId?: string; }

// Bump this string to invalidate all cached replay downloads.
// "4" switches to IDB-based per-item tracking with resume/retry support.
// Bump this when the IDB schema or stored data format changes.
// "5" — removed manifestJson from ReplayDownloadCache (Chrome IDB blob-backing fix).
// "6" — stroke timing v1: used raw wall-clock delta; caused board-ahead regression.
// "7" — stroke timing v2: board-clock "MM:SS" is the authoritative global time;
//        board-timer head-start (timerOffset) is estimated per-batch from the
//        median (clockToMs(startTime) − (timestamp − sessionStartWallMs)) and
//        subtracted, making strokes session-relative to match the audio timeline.
const REPLAY_DATA_VERSION = "7";

// Audio blobs smaller than this are considered corrupted and will be re-fetched.
const MIN_AUDIO_BLOB_SIZE = 1000; // bytes

/** Persist the processed replay manifest to localStorage for the player. */
const setupReplayLocalStorage = (
  manifest: SessionManifestPayload,
  sessionId: string,
  sessionStartWallMs: number,
) => {
  const replayManifest = buildReplayBatches(manifest);
  localStorage.setItem("currentBatches", JSON.stringify(replayManifest));
  localStorage.setItem("replaySessionId", sessionId);
  localStorage.setItem("sessionStartWallMs", String(sessionStartWallMs));
  localStorage.setItem("sessionStartSessionId", sessionId);
  localStorage.setItem("recordingStartTimerMs", "0");
  localStorage.setItem("recordingStartSessionId", sessionId);
};

const StudentReplay = () => {
  const { classId } = useParams<{ classId: string }>();
  const location = useLocation();
  // const navigate = useNavigate();
  const state = (location.state as LocationState | null) ?? null;

  const sessionId = state?.sessionId ?? classId ?? "";
  const lessonId = state?.lessonId ?? classId ?? "";

  // const handleBackToLessons = () => {
  //   navigate("/student/recorded-class");
  // };

  // Fires only when playback actually reaches the end of the timeline (see
  // Replay's onFinished) — not on navigating away or pausing partway through,
  // so "watched" genuinely means "watched it through to the end."
  const handlePlaybackFinished = () => {
    if (!lessonId) return;
    markLessonWatched(lessonId);
    studentService.updateWatchProgress(lessonId, 100).catch((err) => {
      console.error("Failed to report lesson watch completion:", err);
    });
  };

  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Checking cached data…");
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const clearAllAndRetry = async () => {
    setIsClearing(true);
    try {
      // Free Cache API space first (works even when IDB can't open due to full disk)
      await freeDiskSpace();
      // Then try to clean IDB data for this session
      await Promise.allSettled([
        deleteAudioBySession(sessionId),
        deleteClassBySession(sessionId),
        deleteReplayDownloadCache(sessionId),
      ]);
    } finally {
      setIsClearing(false);
      setError(null);
      setProgress(0);
      setIsReady(false);
      setStatusText("Checking cached data…");
      setRetryKey(k => k + 1);
    }
  };

  useEffect(() => {
    if (!sessionId) { setError("Missing session ID."); return; }

    // Reset all display state so a retry (retryKey increment) starts fresh.
    setError(null);
    setProgress(0);
    setIsReady(false);
    setStatusText("Checking cached data…");

    let cancelled = false;

    const prepare = async () => {
      try {
        setStatusText("Checking cached data…");
        setProgress(2);

        // ── Storage check ─────────────────────────────────────────────────────
        // Detect near-full storage before any IDB/download work so we can give
        // an actionable error rather than a cryptic IDB failure mid-download.
        if (navigator.storage?.estimate) {
          try {
            const est = await navigator.storage.estimate();
            const available = (est.quota ?? 0) - (est.usage ?? 0);
            if (available > 0 && available < 15 * 1024 * 1024) {
              // Less than 15 MB left — proactively free Cache API space.
              console.warn('[StudentReplay] Storage critically low (', Math.round(available / 1024 / 1024), 'MB) — freeing cache...');
              await freeDiskSpace();
            }
          } catch { /* estimate is best-effort */ }
        }

        // ── Load download state from IDB ──────────────────────────────────
        // The ReplayDownloadCache record tracks which stroke batches and audio
        // chunks have already been successfully stored in IDB so that an
        // interrupted download can be resumed without re-fetching everything.
        const dlCache = await getReplayDownloadCache(sessionId);

        // ── Resolve manifest (always fetch fresh from API) ────────────────
        // manifestJson was removed from ReplayDownloadCache because Chrome IDB
        // blob-backs values larger than ~64 KB, causing "Failed to write blobs"
        // at the very start of every download. The manifest API call is
        // lightweight (metadata / references only, not stroke data).
        if (!cancelled) { setStatusText("Downloading session manifest…"); setProgress(5); }
        const manifest = await boardSessionService.getStudentManifest(sessionId);
        if (!manifest) throw new Error("Replay manifest not found for this session.");

        // Clear stale IDB data when the cache version changed
        if (dlCache && dlCache.version !== REPLAY_DATA_VERSION) {
          await Promise.allSettled([
            deleteAudioBySession(sessionId),
            deleteClassBySession(sessionId),
            deleteReplayDownloadCache(sessionId),
          ]);
        }

        // Save a lightweight progress record (IDs + arrays only — no large JSON)
        try {
          await saveReplayDownloadCache({
            id: sessionId,
            sessionId,
            version: REPLAY_DATA_VERSION,
            downloadedBatches: dlCache?.version === REPLAY_DATA_VERSION ? (dlCache.downloadedBatches ?? []) : [],
            downloadedAudioChunks: dlCache?.version === REPLAY_DATA_VERSION ? (dlCache.downloadedAudioChunks ?? []) : [],
            createdAt: dlCache?.createdAt ?? Date.now(),
            updatedAt: Date.now(),
          });
        } catch (cacheInitErr) {
          // Non-fatal — downloads proceed; resumable tracking just won't work.
          console.warn('[StudentReplay] Could not initialise download cache:', cacheInitErr);
        }

        const sessionStartWallMs = manifest.session?.recordedAt
          ? new Date(manifest.session.recordedAt).getTime()
          : Date.now();

        // ── Determine what is already in IDB ─────────────────────────────
        const [existingStrokes, existingAudio] = await Promise.all([
          getClassBySession(sessionId),
          getAudioBySession(sessionId),
        ]);

        // Batches whose indexKey appears in the cache are already in STORE_CLASS.
        const downloadedBatchKeys = new Set<string>(
          dlCache?.version === REPLAY_DATA_VERSION ? (dlCache.downloadedBatches ?? []) : []
        );

        // Audio by chunk index; blobs smaller than MIN_AUDIO_BLOB_SIZE are corrupted.
        const audioByChunkIndex = new Map<number, AudioBatch>(
          existingAudio.map(a => [a.batchId, a])
        );

        const batchesToDownload = manifest.strokeBatches.filter(
          b => !downloadedBatchKeys.has(b.indexKey)
        );
        const chunksToDownload = manifest.chunks.filter(c => {
          if (c.audio.sizeBytes === 0) return false; // server uploaded nothing
          const existing = audioByChunkIndex.get(c.index);
          return !existing || existing.blob.size < MIN_AUDIO_BLOB_SIZE;
        });

        // ── Fast path: everything already downloaded ──────────────────────
        // Log a warning when the server reports audio data but no chunk URLs —
        // this is a backend data inconsistency (audio on Cloudinary but chunk
        // records missing from the manifest).
        if (manifest.chunks.length === 0 && (manifest.stats?.totalAudioSizeBytes ?? 0) > 0) {
          console.warn(
            '[StudentReplay] Manifest has no audio chunks but totalAudioSizeBytes > 0.',
            'Audio will not play for this session. This is a server-side data issue.',
            { totalAudioSizeBytes: manifest.stats?.totalAudioSizeBytes, chunkCount: manifest.stats?.chunkCount },
          );
        }

        if (
          batchesToDownload.length === 0 &&
          chunksToDownload.length === 0 &&
          existingStrokes.length > 0
        ) {
          setupReplayLocalStorage(manifest, sessionId, sessionStartWallMs);
          if (!cancelled) { setProgress(100); setIsReady(true); }
          return;
        }

        // ── Status message ────────────────────────────────────────────────
        const corruptedCount = chunksToDownload.filter(c => audioByChunkIndex.has(c.index)).length;
        if (corruptedCount > 0) {
          setStatusText(`Re-downloading ${corruptedCount} corrupted audio chunk(s)…`);
        } else if (batchesToDownload.length > 0) {
          setStatusText("Downloading board data…");
        }

        const totalItems = batchesToDownload.length + chunksToDownload.length +
          manifest.mediaAssets.length + 1;
        let doneItems = 1;

        // Running sets — updated locally after each item, then persisted to IDB
        const persistedBatches = new Set<string>(downloadedBatchKeys);
        const persistedAudioChunks = new Set<number>(
          dlCache?.version === REPLAY_DATA_VERSION ? (dlCache.downloadedAudioChunks ?? []) : []
        );
        const persistProgress = async () => {
          try {
            await saveReplayDownloadCache({
              id: sessionId,
              sessionId,
              version: REPLAY_DATA_VERSION,
              downloadedBatches: Array.from(persistedBatches),
              downloadedAudioChunks: Array.from(persistedAudioChunks),
              createdAt: dlCache?.createdAt ?? Date.now(),
              updatedAt: Date.now(),
            });
          } catch (persistErr) {
            // Non-fatal: progress tracking is best-effort.
            console.warn('[StudentReplay] persistProgress failed (resumable download may not work):', persistErr);
          }
        };

        // ── Stroke batches ────────────────────────────────────────────────
        for (const batchRef of batchesToDownload) {
          if (cancelled) return;

          const batch = await boardSessionService.getBatchByIndexKey(sessionId, batchRef.indexKey);
          if (!batch) {
            // Batch missing from server — skip without marking as done so it
            // retries on the next visit.
            continue;
          }

          const batchStartMs = Math.max(0, batchRef.startMs ?? batch.startMs ?? 0);
          const batchEndMs = Math.max(batchStartMs + 1000, batchRef.endMs ?? batch.endMs ?? batchStartMs + 60000);
          const batchWindowMs = Math.max(1000, batchEndMs - batchStartMs);

          const sorted = [...batch.strokes].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
          const validTs = sorted.map(s => s.timestamp).filter((t): t is number => typeof t === "number" && Number.isFinite(t));
          const minTs = validTs.length > 0 ? Math.min(...validTs) : null;
          const maxTs = validTs.length > 0 ? Math.max(...validTs) : null;

          // ── Estimate the board-timer head-start (timerOffset) for this batch ──
          //
          // stroke.startTime = "MM:SS" board-clock value at mousedown.
          // This includes any time the board timer ran BEFORE the teacher clicked
          // "Start Recording" (timerOffset). Audio chunks use session-relative ms
          // (0-based from recording start), so strokes must also be 0-based.
          //
          // timerOffset = clockToMs(startTime) - (timestamp - sessionStartWallMs)
          //             = boardTimerMs - sessionElapsedMs
          //
          // We compute this for each stroke that has a valid absolute timestamp
          // (timestamp >> sessionStartWallMs i.e. a real wall-clock value) and take
          // the median to filter any noisy outliers.
          const timerOffsetSamples: number[] = [];
          for (const s of sorted) {
            if (typeof s.timestamp !== "number" || !Number.isFinite(s.timestamp)) continue;
            const wallMs = s.timestamp - sessionStartWallMs;
            // Only trust timestamps that look like real wall-clock values
            // (positive, and within the session window plus a generous 5-min buffer).
            if (wallMs < 0 || wallMs > batchEndMs + 300_000) continue;
            const clockMs = clockToMs(s.startTime);
            if (!Number.isFinite(clockMs)) continue;
            const diff = clockMs - wallMs;  // should equal timerOffset
            if (diff >= 0 && diff < 3_600_000) timerOffsetSamples.push(diff);
          }
          timerOffsetSamples.sort((a, b) => a - b);
          const estimatedTimerOffset = timerOffsetSamples.length > 0
            ? timerOffsetSamples[Math.floor(timerOffsetSamples.length / 2)]
            : 0;

          const normalized = sorted.map((stroke, index) => {
            const duration = Math.max(50, stroke.duration ?? 0);

            // Use the board-clock "MM:SS" value as the authoritative global time,
            // then subtract the estimated timerOffset so the result is
            // session-relative (0-based from when recording actually started).
            // This matches the audio chunk timeline where chunk N starts at N*60000 ms.
            // Falls back gracefully to the raw timer value when offset estimation
            // produced no valid samples (same behaviour as before this fix).
            const candidateStart = clockToMs(stroke.startTime) - estimatedTimerOffset;

            const inWindow = Number.isFinite(candidateStart) &&
              candidateStart >= batchStartMs - 2000 && candidateStart <= batchEndMs + 2000;

            let alignedStart: number;
            if (inWindow) {
              alignedStart = candidateStart;
            } else if (minTs !== null && maxTs !== null && maxTs > minTs && typeof stroke.timestamp === "number") {
              const ratio = (stroke.timestamp - minTs) / (maxTs - minTs);
              alignedStart = batchStartMs + Math.round(ratio * Math.max(0, batchWindowMs - duration));
            } else {
              alignedStart = batchStartMs + Math.round((index / Math.max(1, sorted.length - 1)) * Math.max(0, batchWindowMs - duration));
            }
            alignedStart = Math.max(batchStartMs, Math.min(alignedStart, Math.max(batchStartMs, batchEndMs - duration)));

            // End time derived purely from start + draw duration so it is also
            // free of any timerOffset contamination in stroke.endTime.
            const alignedEnd = Math.max(alignedStart + 50, Math.min(batchEndMs, alignedStart + duration));

            return {
              ...stroke,
              sessionId,
              timestamp: sessionStartWallMs + alignedStart,
              startTime: toMmSs(alignedStart),
              endTime: toMmSs(alignedEnd),
              duration: Math.max(50, alignedEnd - alignedStart),
            };
          });

          try {
            await addStrokes(normalized);
          } catch (strokeErr) {
            // Non-fatal: if IDB can't store strokes (e.g. quota), the batch is
            // skipped. NOT added to persistedBatches so a clean retry re-downloads.
            console.warn(`[StudentReplay] Could not save stroke batch ${batchRef.batchIndex}:`, strokeErr);
          }

          // Mark batch as attempted so we don't loop forever, then persist.
          persistedBatches.add(batchRef.indexKey);
          await persistProgress();

          doneItems++;
          if (!cancelled) {
            setProgress(Math.min(90, Math.round((doneItems / totalItems) * 100)));
            setStatusText(`Downloaded board batch ${batchRef.batchIndex + 1} / ${manifest.strokeBatches.length}`);
          }
        }

        // ── Audio chunks ──────────────────────────────────────────────────
        for (const chunk of chunksToDownload) {
          if (cancelled) return;

          // Remove corrupted blob if present so we don't end up with two
          // entries for the same chunk index.
          const staleBlob = audioByChunkIndex.get(chunk.index);
          if (staleBlob) await deleteAudioById(staleBlob.id);

          const audioRes = await fetch(chunk.audio.url);
          if (!audioRes.ok) throw new Error(`Failed to download audio chunk ${chunk.index}.`);

          const blob = await audioRes.blob();

          // Validate — a blob this small almost certainly failed to decode
          // on the server and is not real audio.
          if (blob.size < MIN_AUDIO_BLOB_SIZE) {
            console.warn(`[StudentReplay] Chunk ${chunk.index} blob too small (${blob.size} B) — skipping`);
            doneItems++;
            if (!cancelled) setProgress(Math.min(95, Math.round((doneItems / totalItems) * 100)));
            continue;
          }

          const chunkWindowMs = Math.max(1000, chunk.endMs - chunk.startMs);
          const actualDurationMs = Math.max(1000, chunk.audio.durationMs > 0 ? chunk.audio.durationMs : chunkWindowMs);
          const audioBatch: AudioBatch = {
            id: `${sessionId}_audio_${chunk.index}`,
            type: "audio",
            sessionId,
            batchId: chunk.index,
            timestamp: sessionStartWallMs + chunk.startMs + actualDurationMs,
            blob,
            duration: actualDurationMs / 1000,
            size: chunk.audio.sizeBytes,
          };

          try {
            await addAudio(audioBatch);
            persistedAudioChunks.add(chunk.index);
            await persistProgress();
          } catch (saveErr) {
            // IDB blob write errors (e.g. Chrome "Failed to write blobs") must NOT
            // abort the whole download. Replay opens with a silent gap for this chunk.
            console.warn(`[StudentReplay] Could not save audio chunk ${chunk.index} to IDB — silent gap:`, saveErr);
          }

          doneItems++;
          if (!cancelled) {
            setProgress(Math.min(95, Math.round((doneItems / totalItems) * 100)));
            setStatusText(`Downloaded audio ${chunk.index + 1} / ${manifest.chunks.length}`);
          }
        }

        // ── Media assets (Cache API) ──────────────────────────────────────
        if (typeof window !== "undefined" && "caches" in window) {
          const cache = await caches.open(LESSON_MEDIA_CACHE);
          for (const media of manifest.mediaAssets) {
            if (cancelled) return;
            const scoped = buildLessonScopedCacheKey(lessonId, media.url);
            const hit = (await cache.match(scoped)) ?? (await cache.match(media.url));
            if (!hit) {
              const fetched = await fetch(media.url);
              if (fetched.ok) {
                await cache.put(media.url, fetched.clone());
                await cache.put(scoped, fetched.clone());
              }
            }
            doneItems++;
            if (!cancelled) {
              setProgress(Math.min(98, Math.round((doneItems / totalItems) * 100)));
              setStatusText(`Cached media asset ${doneItems} / ${manifest.mediaAssets.length}`);
            }
          }
        }

        setupReplayLocalStorage(manifest, sessionId, sessionStartWallMs);
        if (!cancelled) { setProgress(100); setIsReady(true); }
      } catch (err) {
        if (!cancelled) {
          const storageFull = isStorageFullError(err);
          setError(
            storageFull
              ? 'Device storage is full. Tap "Clear cached data & retry" to free space, or manually clear browser data from your device settings.'
              : err instanceof Error ? err.message : 'Failed to load replay.',
          );
        }
      }
    };

    prepare();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, lessonId, retryKey]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl shadow-red-100/40">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-800">We couldn't load this class</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{error}</p>
          <div className="mt-6 flex flex-col gap-2 w-full">
            <button
              onClick={clearAllAndRetry}
              disabled={isClearing}
              className="w-full rounded-full bg-student-chestnut px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4052D6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClearing ? "Clearing cached data…" : "Clear cached data & retry"}
            </button>
            <button
              onClick={() => { setError(null); setIsReady(false); setProgress(0); setRetryKey(k => k + 1); }}
              disabled={isClearing}
              className="w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/50">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-student-chestnut/10">
            <Loader2 className="h-7 w-7 animate-spin text-student-chestnut" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">Preparing your class</p>
            <p className="mt-1 text-sm text-slate-500">
              Getting everything ready — this usually takes just a moment.
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-student-chestnut transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs font-medium text-slate-400">{progress}%</p>
          <p className="sr-only" role="status">{statusText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* <button
        onClick={handleBackToLessons}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/75 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Lessons
      </button> */}
      <Provider store={store}>
        <Replay sessionId={sessionId} onFinished={handlePlaybackFinished} />
      </Provider>
    </div>
  );
};

export default StudentReplay;
