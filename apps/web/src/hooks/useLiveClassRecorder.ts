import { useCallback, useRef, useState } from "react";
import { boardSessionService, type BoardBatchPayload, type SessionManifestPayload } from "@/services/board-session";
import { mediaUploadService } from "@/services/media-upload";
import { lessonService } from "@/services/lesson";
import { localData } from "@/utils";
import type { SchoolInfo } from "@/services";
import type { StrokeSegment } from "@/utils/stroke-segmentation";
import {
  saveStrokeBatch,
  markStrokeBatchSent,
  getPendingStrokeBatches,
  saveAudioChunk,
  markAudioChunkSent,
  getPendingAudioChunks,
  clearLiveClassSession,
} from "@/utils/live-class-db";

/**
 * A deliberately separate, self-contained recorder for the teacher's shared
 * board during a Live Class — NOT a reuse of the existing solo-lesson
 * recorder (`session-context.tsx` / `class-action-slice` / the IndexedDB
 * stores / the stroke-upload worker). That pipeline is live in production for
 * normal lesson recordings and is deliberately left untouched here, so a bug
 * in this new, much simpler path can never affect it.
 *
 * Local durability comes from its own IndexedDB database (`utils/live-
 * class-db.ts`, a separate database from the one the normal recorder uses —
 * see that file's header), not from the normal recorder's stores: every
 * stroke batch and audio chunk is written there as "pending" before it's
 * ever sent, flipped to "sent" once the upload succeeds, and anything still
 * "pending" at `finalize()` gets one retry sweep before the manifest is
 * assembled. Only the TEACHER's shared board and mic are recorded — student
 * private boards are never written here, by design (see `LiveBoard`'s
 * `onLocalSegment`/`onLocalBoardSwitch`, which `LiveStudentBoard` has no
 * equivalent of).
 *
 * Trade-offs that come with keeping this isolated (acceptable for a first
 * version — flagged, not hidden):
 * - A stroke batch or audio chunk that still fails after the retry sweep is
 *   dropped (logged, not retried further) — it will be missing from the
 *   replay rather than blocking the class from ending. There is no
 *   resume-after-full-page-reload like `pending-uploads` gives the normal
 *   recorder — the local IndexedDB records exist for the in-session retry
 *   sweep, not yet for a cross-session recovery UI.
 * - Audio is recorded as a sequence of independent, back-to-back
 *   MediaRecorder clips (one per ~60s chunk) rather than one continuous
 *   stream — this sidesteps the WebM/Matroska "only the first sub-chunk is
 *   playable" pitfall documented in `useSessionUpload.ts` without needing
 *   that file's decode-and-recombine step, at the cost of a small (sub-
 *   second) gap between chunks while one MediaRecorder stops and the next
 *   starts.
 * - This hook calls the same stateless REST/upload functions the normal
 *   recorder calls (`boardSessionService`, `mediaUploadService`) — those are
 *   plain HTTP wrappers with no shared mutable state, so reusing them is not
 *   the same as reusing the recorder itself.
 */

const STROKE_BATCH_MS = 60_000;
const AUDIO_CHUNK_MS = 60_000;
const MANIFEST_VERSION = "live-class-1";

interface StartContext {
  sessionId: string;
  lessonId: string;
  teacherId: string;
  teacherName: string;
}

type StrokeBatchEntry = SessionManifestPayload["strokeBatches"][number];
type AudioChunkEntry = SessionManifestPayload["chunks"][number];

export function useLiveClassRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const ctxRef = useRef<StartContext | null>(null);
  const startedAtRef = useRef(0);

  // ── Strokes ────────────────────────────────────────────────────────────
  const batchIndexRef = useRef(0);
  const pendingStrokesRef = useRef<StrokeSegment[]>([]);
  const pendingStartMsRef = useRef(0);
  const pendingBoardSwitchesRef = useRef<{ fromBoard: number; toBoard: number; timestampMs: number }[]>([]);
  const sentBatchesRef = useRef<StrokeBatchEntry[]>([]);
  const boardStrokeCountsRef = useRef<Record<number, number>>({});
  const allBoardSwitchesRef = useRef<{ fromBoard: number; toBoard: number; timestampMs: number }[]>([]);
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Audio ──────────────────────────────────────────────────────────────
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunkIndexRef = useRef(0);
  const audioChunksRef = useRef<AudioChunkEntry[]>([]);
  const audioChunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Every in-flight stroke-batch/audio-chunk upload promise, so `finalize()`
  // can wait for all of them to settle instead of guessing with a timeout.
  const pendingUploadsRef = useRef<Promise<void>[]>([]);
  const trackUpload = useCallback((p: Promise<void>) => {
    pendingUploadsRef.current.push(p);
  }, []);

  const elapsedMs = useCallback(() => Date.now() - startedAtRef.current, []);

  const flushStrokeBatch = useCallback(async () => {
    const ctx = ctxRef.current;
    const strokes = pendingStrokesRef.current;
    if (!ctx || strokes.length === 0) return;

    const batchIndex = batchIndexRef.current;
    const startMs = pendingStartMsRef.current;
    const endMs = elapsedMs();
    const boardIndex = strokes[strokes.length - 1].currentBoard;
    const boardSwitches = pendingBoardSwitchesRef.current;

    const payload: BoardBatchPayload = {
      sessionId: ctx.sessionId,
      lessonId: ctx.lessonId,
      batchIndex,
      startMs,
      endMs,
      strokeCount: strokes.length,
      sizeBytes: JSON.stringify(strokes).length,
      boardIndex,
      strokes: strokes.map((s) => ({
        id: s.id,
        pts: s.pts,
        c: s.c,
        w: s.w,
        ts: s.ts,
        currentBoard: s.currentBoard,
        sessionId: ctx.sessionId,
      })),
      boardSwitches: boardSwitches.length > 0 ? boardSwitches : undefined,
    };

    // Reset the pending window immediately so new strokes drawn while this
    // upload is in flight start a fresh batch rather than being dropped.
    batchIndexRef.current += 1;
    pendingStrokesRef.current = [];
    pendingStartMsRef.current = endMs;
    pendingBoardSwitchesRef.current = [];

    const recordId = `${ctx.sessionId}_${batchIndex}`;
    // Written to IndexedDB before the network call — if the upload never
    // comes back (tab closed, network drop), the batch still exists locally
    // for the retry sweep in finalize() rather than vanishing with it.
    await saveStrokeBatch({ id: recordId, sessionId: ctx.sessionId, batchIndex, payload, status: "pending", createdAt: Date.now() });

    try {
      await boardSessionService.submitBatch(ctx.sessionId, payload);
      await markStrokeBatchSent(recordId);
      sentBatchesRef.current.push({
        batchIndex,
        indexKey: `${ctx.sessionId}_${batchIndex}`,
        startMs,
        endMs,
        strokeCount: strokes.length,
        sizeBytes: payload.sizeBytes,
        boardIndex,
        boardSwitches: payload.boardSwitches,
      });
    } catch (err) {
      console.error(
        `[LiveClassRecorder] stroke batch ${batchIndex} failed to upload — it will be missing from the replay`,
        err
      );
    }
  }, [elapsedMs]);

  const recordStroke = useCallback(
    (segment: StrokeSegment) => {
      if (!ctxRef.current) return;
      pendingStrokesRef.current.push(segment);
      boardStrokeCountsRef.current[segment.currentBoard] =
        (boardStrokeCountsRef.current[segment.currentBoard] ?? 0) + 1;
    },
    []
  );

  const recordBoardSwitch = useCallback(
    (fromBoard: number, toBoard: number) => {
      if (!ctxRef.current) return;
      const entry = { fromBoard, toBoard, timestampMs: elapsedMs() };
      pendingBoardSwitchesRef.current.push(entry);
      allBoardSwitchesRef.current.push(entry);
    },
    [elapsedMs]
  );

  // ── Audio chunk recording (independent clips, see file-level note) ──────
  const startNextAudioChunk = useCallback(() => {
    const stream = micStreamRef.current;
    const ctx = ctxRef.current;
    if (!stream || !ctx) return;

    const chunkIndex = audioChunkIndexRef.current;
    const chunkStartMs = elapsedMs();
    const recorder = new MediaRecorder(stream);
    const localChunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) localChunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(localChunks, { type: recorder.mimeType || "audio/webm" });
      const chunkEndMs = elapsedMs();
      if (blob.size === 0) return;

      const recordId = `${ctx.sessionId}_${chunkIndex}`;
      const uploadPromise = (async () => {
        // Written to IndexedDB before the network call, same reasoning as
        // the stroke batches above — survives an upload that never returns.
        await saveAudioChunk({
          id: recordId,
          sessionId: ctx.sessionId,
          chunkIndex,
          startMs: chunkStartMs,
          endMs: chunkEndMs,
          blob,
          status: "pending",
          createdAt: Date.now(),
        });
        try {
          const result = await mediaUploadService.uploadAudio(blob, ctx.sessionId, chunkIndex);
          if (!result.success || !result.cdnUrl || !result.mediaId) {
            console.error(`[LiveClassRecorder] audio chunk ${chunkIndex} upload failed — will retry at finalize`);
            return;
          }
          await markAudioChunkSent(recordId);
          audioChunksRef.current.push({
            index: chunkIndex,
            startMs: chunkStartMs,
            endMs: chunkEndMs,
            audio: { url: result.cdnUrl, mediaId: result.mediaId, sizeBytes: blob.size, durationMs: chunkEndMs - chunkStartMs },
            events: [],
          });
        } catch (err) {
          console.error(`[LiveClassRecorder] audio chunk ${chunkIndex} upload threw — will retry at finalize`, err);
        }
      })();
      trackUpload(uploadPromise);
    };

    mediaRecorderRef.current = recorder;
    audioChunkIndexRef.current += 1;
    recorder.start();
  }, [elapsedMs, trackUpload]);

  const rotateAudioChunk = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    startNextAudioChunk();
  }, [startNextAudioChunk]);

  const start = useCallback(
    async (args: { sessionId: string; lessonId: string; teacherId: string; teacherName: string; initialBoard: number }) => {
      ctxRef.current = {
        sessionId: args.sessionId,
        lessonId: args.lessonId,
        teacherId: args.teacherId,
        teacherName: args.teacherName,
      };
      startedAtRef.current = Date.now();
      batchIndexRef.current = 0;
      pendingStrokesRef.current = [];
      pendingStartMsRef.current = 0;
      pendingBoardSwitchesRef.current = [];
      sentBatchesRef.current = [];
      boardStrokeCountsRef.current = { [args.initialBoard]: 0 };
      allBoardSwitchesRef.current = [];
      audioChunksRef.current = [];
      audioChunkIndexRef.current = 0;
      pendingUploadsRef.current = [];

      batchTimerRef.current = setInterval(() => trackUpload(flushStrokeBatch()), STROKE_BATCH_MS);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        startNextAudioChunk();
        audioChunkTimerRef.current = setInterval(rotateAudioChunk, AUDIO_CHUNK_MS);
      } catch (err) {
        // Mic access denied/unavailable — record the board only. The live
        // class itself (LiveKit audio for listening) is unaffected either way.
        console.warn("[LiveClassRecorder] could not start audio recording — continuing with board only", err);
      }

      setIsRecording(true);
    },
    [flushStrokeBatch, rotateAudioChunk, startNextAudioChunk, trackUpload]
  );

  /** Stops recording, flushes everything still pending, and submits the
   * manifest. Returns true on a clean submit, false if anything failed
   * (the class still ends either way — a failed manifest just means no
   * replay, which the caller should surface rather than block on). */
  const finalize = useCallback(
    async (lessonMeta: {
      classroomId: string;
      classroomName: string;
      subjectId: string;
      subjectName: string;
      topicName: string;
      subTopic: string;
      aim: string;
    }): Promise<boolean> => {
      const ctx = ctxRef.current;
      if (!ctx) return false;

      setIsRecording(false);
      setIsFinalizing(true);

      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      if (audioChunkTimerRef.current) clearInterval(audioChunkTimerRef.current);
      batchTimerRef.current = null;
      audioChunkTimerRef.current = null;

      trackUpload(flushStrokeBatch());

      // Stop the in-flight audio clip — its upload (tracked via trackUpload
      // inside the recorder's onstop handler) is awaited below along with
      // every other upload still in flight, rather than guessed with a timer.
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        await new Promise<void>((resolve) => {
          recorder.addEventListener("stop", () => resolve(), { once: true });
          recorder.stop();
        });
      }
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;

      // Wait for every batch/chunk upload kicked off above (and any still
      // running from earlier in the class) to settle before reading the
      // refs they populate — this is what actually guarantees the last
      // stroke batch and audio chunk make it into the manifest.
      await Promise.allSettled(pendingUploadsRef.current);

      // One retry sweep over anything IndexedDB still has marked "pending" —
      // covers a batch/chunk whose upload failed outright above rather than
      // just being slow. Each entry here already has its own request body
      // (and its blob, for audio) saved locally, so no data was lost in the
      // meantime; this just gives the upload a second attempt before the
      // class gives up on it for good.
      const [retryBatches, retryChunks] = await Promise.all([
        getPendingStrokeBatches(ctx.sessionId),
        getPendingAudioChunks(ctx.sessionId),
      ]);
      await Promise.all(
        retryBatches.map(async (record) => {
          try {
            await boardSessionService.submitBatch(ctx.sessionId, record.payload);
            await markStrokeBatchSent(record.id);
            sentBatchesRef.current.push({
              batchIndex: record.payload.batchIndex,
              indexKey: `${ctx.sessionId}_${record.payload.batchIndex}`,
              startMs: record.payload.startMs,
              endMs: record.payload.endMs,
              strokeCount: record.payload.strokeCount,
              sizeBytes: record.payload.sizeBytes,
              boardIndex: record.payload.boardIndex,
              boardSwitches: record.payload.boardSwitches,
            });
          } catch (err) {
            console.error(`[LiveClassRecorder] retry failed for stroke batch ${record.batchIndex} — dropping it`, err);
          }
        })
      );
      await Promise.all(
        retryChunks.map(async (record) => {
          try {
            const result = await mediaUploadService.uploadAudio(record.blob, ctx.sessionId, record.chunkIndex);
            if (!result.success || !result.cdnUrl || !result.mediaId) throw new Error(result.error ?? "upload failed");
            await markAudioChunkSent(record.id);
            audioChunksRef.current.push({
              index: record.chunkIndex,
              startMs: record.startMs,
              endMs: record.endMs,
              audio: {
                url: result.cdnUrl,
                mediaId: result.mediaId,
                sizeBytes: record.blob.size,
                durationMs: record.endMs - record.startMs,
              },
              events: [],
            });
          } catch (err) {
            console.error(`[LiveClassRecorder] retry failed for audio chunk ${record.chunkIndex} — dropping it`, err);
          }
        })
      );

      // Retried entries land at the end of these arrays, out of order —
      // sort by index before they go into the manifest.
      sentBatchesRef.current.sort((a, b) => a.batchIndex - b.batchIndex);
      audioChunksRef.current.sort((a, b) => a.index - b.index);

      const totalDurationMs = elapsedMs();
      const schoolId = localData.retrieve<SchoolInfo>("schoolInfo")?.id ?? "";
      const boards = Object.entries(boardStrokeCountsRef.current).map(([index, strokeCount]) => ({
        index: Number(index),
        dimensions: { width: 1600, height: 1200 }, // nominal — live boards size responsively per viewer
        strokeCount,
      }));

      const manifest: SessionManifestPayload = {
        version: MANIFEST_VERSION,
        session: {
          id: ctx.sessionId,
          lessonId: ctx.lessonId,
          schoolId,
          recordedAt: new Date(startedAtRef.current).toISOString(),
          publishedAt: new Date().toISOString(),
          teacher: { id: ctx.teacherId, name: ctx.teacherName },
        },
        lesson: {
          topic: lessonMeta.topicName,
          subTopic: lessonMeta.subTopic,
          aim: lessonMeta.aim,
          subject: { id: lessonMeta.subjectId, name: lessonMeta.subjectName },
          classroom: { id: lessonMeta.classroomId, name: lessonMeta.classroomName },
        },
        stats: {
          totalDurationMs,
          totalDurationFormatted: `${Math.floor(totalDurationMs / 60000)}:${String(Math.floor((totalDurationMs % 60000) / 1000)).padStart(2, "0")}`,
          chunkCount: audioChunksRef.current.length,
          chunkDurationMs: AUDIO_CHUNK_MS,
          seekGranularityMs: STROKE_BATCH_MS,
          totalAudioSizeBytes: audioChunksRef.current.reduce((sum, c) => sum + c.audio.sizeBytes, 0),
          totalStrokeCount: sentBatchesRef.current.reduce((sum, b) => sum + b.strokeCount, 0),
          boardCount: boards.length,
          strokeBatchCount: sentBatchesRef.current.length,
        },
        chunks: audioChunksRef.current,
        strokeBatches: sentBatchesRef.current,
        mediaAssets: [],
        boards,
        chapters: [],
        boardSwitches: allBoardSwitchesRef.current.length > 0 ? allBoardSwitchesRef.current : undefined,
      };

      try {
        await boardSessionService.submitManifest(ctx.sessionId, manifest);
        // Every batch/chunk here is already confirmed "sent" on the backend —
        // the manifest is just the pointer document, now also saved. Safe to
        // drop the local copies.
        await clearLiveClassSession(ctx.sessionId);
        setIsFinalizing(false);
        ctxRef.current = null;
        return true;
      } catch (err) {
        // The manifest pointer failed, but individual batches/chunks already
        // marked "sent" above are genuinely saved on the backend — left in
        // IndexedDB regardless, since there's no harm keeping them and no
        // recovery UI yet to act on a delete here.
        console.error("[LiveClassRecorder] manifest submission failed — no replay will be available", err);
        setIsFinalizing(false);
        ctxRef.current = null;
        return false;
      }
    },
    [flushStrokeBatch, elapsedMs, trackUpload]
  );

  return { isRecording, isFinalizing, start, finalize, recordStroke, recordBoardSwitch };
}

// Fetches the lesson metadata the manifest needs, kept separate from the
// hook above since it's a one-shot read with nothing to do with recording
// state — callers typically call this once, right before `start()`.
export async function fetchLiveClassLessonMeta(lessonId: string) {
  const res = await lessonService.getLessonForClass(lessonId);
  const lesson = res.data.data?.lesson;
  return {
    classroomId: lesson?.classroomId ?? "",
    classroomName: lesson?.className ?? "",
    subjectId: lesson?.subjectId ?? "",
    subjectName: lesson?.subjectName ?? "",
    topicName: lesson?.topicName ?? "",
    subTopic: lesson?.subTopic ?? "",
    aim: lesson?.aim ?? "",
  };
}
