/// <reference lib="webworker" />
/**
 * Session Worker — off-loads these from the main thread:
 *   • gzip compression of stroke / shape data
 *   • IndexedDB writes (strokes + audio blobs)  — via idb (same as main thread)
 *   • Drift-free batch timer (anchored to session start)
 *   • Manifest building (media show/hide, board/audio flags)
 *
 * The worker drives the 10-second clock. On each TICK it posts a message
 * to the main thread so the MediaRecorder is stopped at the correct moment,
 * keeping audio and board batches aligned to the same master clock.
 *
 * localStorage is not available in workers — the manifest JSON is posted
 * back to the main thread for storage.
 */

import { openDB, type IDBPDatabase } from 'idb';
import {
  DB_NAME, DB_VERSION, STORE_CLASS, STORE_AUDIO,
  STORE_SESSIONS, STORE_AUDIO_CHUNKS, STORE_STROKE_BATCHES,
  type CompressedStroke, type AudioBatch, type IBatch, type IActiveMedia,
  type LocalSession, type LocalAudioChunk, type LocalStrokeBatch,
} from '@/utils/constant';

// ── Batch Configuration ───────────────────────────────────────────────────────
// LOCAL_BATCH_MS: Granularity for local replay seeking (10s = fine-grained seek)
// UPLOAD_BATCH_MS: Granularity for upload to reduce API calls (60s = efficient)
//
// During recording: strokes/audio saved locally in 10s chunks for smooth seeking
// During upload: multiple 10s chunks merged into 60s batches for efficiency
const LOCAL_BATCH_MS = 10_000;   // 10s - for local replay/seeking
const UPLOAD_BATCH_MS = 60_000;  // 60s - for upload batching

// BATCH_MS controls the local timer tick (used for replay granularity)
const BATCH_MS = LOCAL_BATCH_MS;

// ── Types for inbound messages ────────────────────────────────────────────────

// Session metadata passed on INIT for sync architecture
interface SessionMetadata {
  lessonId: string;
  schoolId: string;
  teacher: { id: string; name: string; email: string };
  lesson: {
    topic: string;
    subTopic: string;
    aim: string;
    subjectId: string;
    subjectName: string;
    classroomId: string;
    className: string;
  };
  deviceType: string;
  screenWidth: number;
  screenHeight: number;
}

type ToWorkerMsg =
  | { type: 'INIT'; sessionId: string; sessionStartMs: number; metadata?: SessionMetadata; }
  | { type: 'RAW_STROKE'; id: string; rawPoints: number[]; color: string; width: number;
      strokeType: 'stroke' | 'eraser'; currentBoard: number;
    startTime: string; endTime: string; timestamp: number; duration?: number; }
  | { type: 'RAW_SHAPE';  id: string; shape: Record<string, unknown>; color: string;
      strokeWidth: number; shapeType: string; currentBoard: number;
    startTime: string; endTime: string; timestamp: number; duration?: number; }
  | { type: 'AUDIO_CHUNK'; blob: Blob; batchIndex: number; duration: number; }
  | { type: 'MEDIA_SHOW'; mediaId: string; name: string; mediaType: string;
      url: string; timerDisplay: string; elapsedMs?: number; frameIndex?: 0 | 1; }
    | { type: 'MEDIA_HIDE'; mediaId: string; timerDisplay: string; elapsedMs?: number; }
    | { type: 'PDF_PAGE';   mediaId: string; page: number; timerDisplay: string; elapsedMs?: number; }
    | { type: 'MEDIA_SCROLL'; mediaId: string; scrollRatio: number; timerDisplay: string; elapsedMs?: number; }
    | { type: 'MEDIA_PLAYBACK'; mediaId: string; state: 'play' | 'pause'; timerDisplay: string; elapsedMs?: number; }
  | { type: 'BOARD_SWITCH'; fromBoard: number; toBoard: number; elapsedMs: number; }
  | { type: 'PAUSE'; elapsedMs: number; }
  | { type: 'RESUME'; }
  | { type: 'END'; }

// ── Session state ─────────────────────────────────────────────────────────────

let sessionId         = '';
let sessionStartMs    = 0;
let currentSlot       = 0;
let _db: IDBPDatabase | null = null;

// Per-batch accumulators — no stroke buffer; strokes are written to IDB immediately
// after compression so replay sees them in near real-time (< 20ms latency).
let hasStrokesInBatch = false;
let batchMediaActions: IActiveMedia[] = [];
let boardEventsList: Array<{ id: string; type: 'switch'; timestampMs: number; fromBoard: number; toBoard: number }> = [];

// Full session manifest (grows each batch)
let manifest = { totalDuration: 0, totalBatches: 0, batches: [] as IBatch[] };

let batchTimer: ReturnType<typeof setTimeout> | null = null;

// ── New Sync Architecture State ───────────────────────────────────────────────
// Track metadata for sync stores
let sessionMetadata: SessionMetadata | null = null;
let pausedDurationMs = 0;
let isPaused = false;
let pauseStartMs = 0;

// Stroke accumulator for upload batches (60s)
// Local batches are 10s, upload batches are 60s (6 local batches = 1 upload batch)
let uploadBatchIndex = 0;
let currentUploadBatchStrokes: CompressedStroke[] = [];
let uploadBatchStartMs = 0;
let audioChunkIndex = 0;

// Audio chunk accumulator for merging 10s local chunks into 60s upload chunks
void ([] as Array<{ blob: Blob; batchIndex: number; duration: number }>); // reserved for future merge batching
void 0; // uploadAudioBatchIndex reserved

// ── IndexedDB via idb ─────────────────────────────────────────────────────────
// idb works in workers — it has no DOM dependencies.
// A single connection is opened once and reused for the whole session.

async function getDb(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database, _oldVersion) {
      //console.log('[Worker DB] Running upgrade handler...');

      // Legacy stores
      if (!database.objectStoreNames.contains(STORE_CLASS)) {
        //console.log('[Worker DB] Creating store:', STORE_CLASS);
        database.createObjectStore(STORE_CLASS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_AUDIO)) {
        //console.log('[Worker DB] Creating store:', STORE_AUDIO);
        database.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
      }

      // Sessions store - ALWAYS check and create if missing
      if (!database.objectStoreNames.contains(STORE_SESSIONS)) {
        //console.log('[Worker DB] Creating store:', STORE_SESSIONS);
        const sessionsStore = database.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        sessionsStore.createIndex('lessonId', 'lessonId', { unique: false });
        sessionsStore.createIndex('status', 'status', { unique: false });
      }

      // Audio chunks store - ALWAYS check and create if missing
      if (!database.objectStoreNames.contains(STORE_AUDIO_CHUNKS)) {
        //console.log('[Worker DB] Creating store:', STORE_AUDIO_CHUNKS);
        const audioStore = database.createObjectStore(STORE_AUDIO_CHUNKS, { keyPath: 'id' });
        audioStore.createIndex('sessionId', 'sessionId', { unique: false });
        audioStore.createIndex('lessonId', 'lessonId', { unique: false });
        audioStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        audioStore.createIndex('sessionId_chunkIndex', ['sessionId', 'chunkIndex'], { unique: true });
      }

      // Stroke batches store - ALWAYS check and create if missing
      if (!database.objectStoreNames.contains(STORE_STROKE_BATCHES)) {
        //console.log('[Worker DB] Creating store:', STORE_STROKE_BATCHES);
        const strokesStore = database.createObjectStore(STORE_STROKE_BATCHES, { keyPath: 'id' });
        strokesStore.createIndex('sessionId', 'sessionId', { unique: false });
        strokesStore.createIndex('lessonId', 'lessonId', { unique: false });
        strokesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        strokesStore.createIndex('sessionId_batchIndex', ['sessionId', 'batchIndex'], { unique: true });
      }

      //console.log('[Worker DB] Upgrade complete. Stores:', Array.from(database.objectStoreNames));
    },
  });
  return _db;
}

async function writeStrokes(strokes: CompressedStroke[]): Promise<void> {
  if (strokes.length === 0) return;
  const db = await getDb();
  const tx = db.transaction(STORE_CLASS, 'readwrite');
  await Promise.all([
    ...strokes.map(s => tx.store.put(s)),
    tx.done,
  ]);
}

async function writeAudio(payload: AudioBatch): Promise<void> {
  await (await getDb()).add(STORE_AUDIO, payload);
}

// ── New Sync Architecture Write Functions ─────────────────────────────────────

async function createLocalSession(session: LocalSession): Promise<void> {
  await (await getDb()).add(STORE_SESSIONS, session);
}

async function updateLocalSession(session: LocalSession): Promise<void> {
  session.modifiedAt = new Date().toISOString();
  await (await getDb()).put(STORE_SESSIONS, session);
}

async function getLocalSession(id: string): Promise<LocalSession | undefined> {
  return (await getDb()).get(STORE_SESSIONS, id);
}

async function writeAudioChunk(chunk: LocalAudioChunk): Promise<void> {
  await (await getDb()).add(STORE_AUDIO_CHUNKS, chunk);
}

async function writeStrokeBatch(batch: LocalStrokeBatch): Promise<void> {
  await (await getDb()).add(STORE_STROKE_BATCHES, batch);
}

function estimateStrokesSize(strokes: CompressedStroke[]): number {
  return strokes.reduce((sum, s) => {
    return sum + s.data.length + s.id.length + (s.sessionId?.length ?? 0) + 100;
  }, 0);
}

// Flush accumulated strokes to a 1-minute upload batch
async function flushUploadStrokeBatch(force = false): Promise<void> {
  if (!sessionMetadata) return;
  if (currentUploadBatchStrokes.length === 0 && !force) return;

  const now = Date.now();
  const elapsedSinceStart = now - uploadBatchStartMs;

  // Only flush if 1 minute has passed OR forced (end of session)
  if (!force && elapsedSinceStart < UPLOAD_BATCH_MS) return;

  const strokes = currentUploadBatchStrokes.slice();
  const startMs = uploadBatchIndex * UPLOAD_BATCH_MS;
  const endMs = startMs + UPLOAD_BATCH_MS;

  const batchBoardSwitches = boardEventsList
    .filter(e => e.timestampMs >= startMs && e.timestampMs < endMs)
    .map(e => ({ fromBoard: e.fromBoard, toBoard: e.toBoard, timestampMs: e.timestampMs }));

  const batch: LocalStrokeBatch = {
    id: crypto.randomUUID(),
    sessionId,
    lessonId: sessionMetadata.lessonId,
    batchIndex: uploadBatchIndex,
    startMs,
    endMs,
    strokes,
    strokeCount: strokes.length,
    sizeBytes: estimateStrokesSize(strokes),
    boardSwitches: batchBoardSwitches.length > 0 ? batchBoardSwitches : undefined,
    syncStatus: 'pending',
    uploadAttempts: 0,
    lastAttemptAt: null,
    lastError: null,
    createdAt: new Date().toISOString(),
    sentAt: null,
  };

  try {
    await writeStrokeBatch(batch);

    // Update session totals
    const session = await getLocalSession(sessionId);
    if (session) {
      session.totalStrokeBatches = uploadBatchIndex + 1;
      await updateLocalSession(session);
    }
  } catch (err) {
    postError(`flushUploadStrokeBatch: ${err}`);
  }

  // Reset for next batch
  currentUploadBatchStrokes = [];
  uploadBatchIndex++;
  uploadBatchStartMs = now;
}

// ── Compression (runs off main thread) ───────────────────────────────────────

async function gzipCompress(data: string): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(new TextEncoder().encode(data));
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

// Safe btoa for large buffers — avoids call-stack overflow from spread operator
function toBase64(u8: Uint8Array): string {
  let binary = '';
  const CHUNK = 8_192;
  for (let i = 0; i < u8.length; i += CHUNK)
    binary += String.fromCharCode(...u8.subarray(i, i + CHUNK));
  return btoa(binary);
}

// ── Drift-free batch timer ────────────────────────────────────────────────────
// Each timeout is computed relative to sessionStartMs, not the previous fire.
// This prevents cumulative drift (setTimeout can be up to ~50ms late each call).

function scheduleNextBatch() {
  if (batchTimer) clearTimeout(batchTimer);
  const nextBoundaryMs = sessionStartMs + (currentSlot + 1) * BATCH_MS;
  const delay = Math.max(0, nextBoundaryMs - Date.now());
  batchTimer = setTimeout(flushAndTick, delay);
}

function secondsToClock(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function flushAndTick() {
  const slot = currentSlot;
  currentSlot++;

  // Strokes are already in IDB (written immediately on RAW_STROKE).
  // TICK is only responsible for manifest building + audio sync signal.

  // ── Build manifest entry for this batch ──
  // startTime/endTime follow the existing nextTime() × 10 convention
  const startVal = slot * 10;
  const endVal   = (slot + 1) * 10;

  const batch: IBatch = {
    id:        crypto.randomUUID(),
    startTime: String(startVal),
    endTime:   String(endVal),
    hasAudio:  true,                     // session is active = audio is recording
    hasBoard:  hasStrokesInBatch,
    ...(batchMediaActions.length > 0
      ? { mediaAction: batchMediaActions.slice() }
      : {}),
  };

  manifest.batches.push(batch);
  manifest.totalBatches  = manifest.batches.length;
  manifest.totalDuration = BATCH_MS * manifest.totalBatches;

  // ── 3. Reset per-batch accumulators ──
  hasStrokesInBatch = false;
  batchMediaActions = [];

  // ── 4. Notify main thread ──
  //   TICK  → stop the current MediaRecorder at the right moment
  //   MANIFEST_UPDATE → persist to localStorage (worker cannot access it)
  self.postMessage({ type: 'TICK', batchSlot: slot });
  self.postMessage({ type: 'MANIFEST_UPDATE', manifest: JSON.stringify(manifest) });

  // ── 5. Schedule the next batch from the anchored reference ──
  scheduleNextBatch();
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<ToWorkerMsg>) => {
  const msg = e.data;

  switch (msg.type) {

    case 'INIT': {
      // Reset all state for a new session
      sessionId         = msg.sessionId;
      sessionStartMs    = msg.sessionStartMs;
      currentSlot       = 0;
      batchMediaActions = [];
      hasStrokesInBatch = false;
      manifest          = { totalDuration: 0, totalBatches: 0, batches: [] };

      // Reset sync architecture state
      sessionMetadata = msg.metadata ?? null;
      pausedDurationMs = 0;
      isPaused = false;
      pauseStartMs = 0;
      uploadBatchIndex = 0;
      currentUploadBatchStrokes = [];
      uploadBatchStartMs = sessionStartMs;
      audioChunkIndex = 0;

      if (batchTimer) clearTimeout(batchTimer);

      try {
        // Warm the connection now so the first write has no cold-start latency
        await getDb();

        // Create or update LocalSession record if metadata provided (new sync architecture)
        if (sessionMetadata) {
          // Check if session already exists (continuation/recovery scenario)
          const existingSession = await getLocalSession(sessionId);

          if (existingSession) {
            // Update existing session to recording status
            //console.log('[Worker] Continuing existing session, updating status to recording');
            existingSession.status = 'recording';
            existingSession.modifiedAt = new Date().toISOString();
            await updateLocalSession(existingSession);
          } else {
            // Create new session record
            const localSession: LocalSession = {
              id: sessionId,
              lessonId: sessionMetadata.lessonId,
              schoolId: sessionMetadata.schoolId,
              status: 'recording',
              uploadRequested: false,
              teacher: sessionMetadata.teacher,
              lesson: sessionMetadata.lesson,
              recording: {
                startedAt: new Date(sessionStartMs).toISOString(),
                endedAt: null,
                totalDurationMs: 0,
                pausedDurationMs: 0,
                deviceType: sessionMetadata.deviceType,
                screenWidth: sessionMetadata.screenWidth,
                screenHeight: sessionMetadata.screenHeight,
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

            try {
              await createLocalSession(localSession);
            } catch (err) {
              // Session may already exist from a previous recording attempt
              postError(`LocalSession create (may already exist): ${err}`);
            }
          }
        }

        self.postMessage({ type: 'READY' });
        scheduleNextBatch();
      } catch (err) {
        postError(`DB init failed: ${err}`);
      }
      break;
    }

    case 'RAW_STROKE': {
      const { id, rawPoints, color, width, strokeType, currentBoard,
              startTime, endTime, timestamp, duration } = msg;
      try {
        const compressed = await gzipCompress(JSON.stringify(rawPoints));
        const base64     = toBase64(compressed);
        const stroke: CompressedStroke = {
          id, sessionId, data: base64, color, width,
          type: strokeType, currentBoard, timestamp,
          duration: duration ?? 0, startTime, endTime,
        };
        // Write immediately — replay sees it within ~10-20ms of drawing
        await writeStrokes([stroke]);
        hasStrokesInBatch = true;

        // Accumulate for sync architecture upload batches (1-minute chunks)
        if (sessionMetadata) {
          currentUploadBatchStrokes.push(stroke);
          // Check if we should flush the upload batch
          await flushUploadStrokeBatch(false);
        }
      } catch (err) {
        postError(`RAW_STROKE compress: ${err}`);
      }
      break;
    }

    case 'RAW_SHAPE': {
      const { id, shape, color, strokeWidth, shapeType, currentBoard,
              startTime, endTime, timestamp, duration } = msg;
      try {
        const compressed = await gzipCompress(JSON.stringify(shape));
        const base64     = toBase64(compressed);
        const stroke: CompressedStroke = {
          id, sessionId, data: base64, color,
          width: strokeWidth, type: shapeType,
          currentBoard, timestamp, duration: 0,
          startTime, endTime,
        };
        stroke.duration = duration ?? stroke.duration;
        // Write immediately
        await writeStrokes([stroke]);
        hasStrokesInBatch = true;

        // Accumulate for sync architecture upload batches (1-minute chunks)
        if (sessionMetadata) {
          currentUploadBatchStrokes.push(stroke);
          await flushUploadStrokeBatch(false);
        }
      } catch (err) {
        postError(`RAW_SHAPE compress: ${err}`);
      }
      break;
    }

    case 'AUDIO_CHUNK': {
      const { blob, batchIndex, duration } = msg;

      // Don't skip chunks even if paused - the chunk was recorded BEFORE pause
      // and needs to be saved for complete replay

      try {
        // Write to legacy store for backward compatibility / immediate replay
        // Timestamp = wall clock minus paused time (same formula as strokes)
        await writeAudio({
          id:        crypto.randomUUID(),
          type:      'audio',
          sessionId,
          batchId:   batchIndex,
          timestamp: Date.now() - pausedDurationMs,
          blob,
          duration,
          size:      blob.size,
        });

        // Write to new sync architecture store with sync status
        if (sessionMetadata) {
          // Calculate timestamps based on ACTUAL elapsed time
          // NOTE: sessionStartMs is adjusted on RESUME (sessionStartMs += pauseDuration)
          // so (now - sessionStartMs) already accounts for paused time - don't subtract pausedDurationMs again!
          const now = Date.now();
          const elapsedMs = now - sessionStartMs;  // Already accounts for pause via adjusted sessionStartMs
          const durationMs = duration * 1000;
          const startMs = Math.max(0, elapsedMs - durationMs);
          const endMs = elapsedMs;

          //console.log('[Worker] Audio chunk:', audioChunkIndex, 'elapsed:', elapsedMs, 'startMs:', startMs, 'endMs:', endMs, 'duration:', duration.toFixed(2) + 's');

          // Calculate which 60s upload batch this 10s chunk belongs to
          // Chunks 0-5 → uploadBatch 0, chunks 6-11 → uploadBatch 1, etc.
          const chunksPerUploadBatch = UPLOAD_BATCH_MS / LOCAL_BATCH_MS; // 6
          const currentUploadBatchIdx = Math.floor(audioChunkIndex / chunksPerUploadBatch);

          const audioChunk: LocalAudioChunk = {
            id: crypto.randomUUID(),
            sessionId,
            lessonId: sessionMetadata.lessonId,
            chunkIndex: audioChunkIndex,        // 10s local index
            uploadBatchIndex: currentUploadBatchIdx, // 60s upload batch
            startMs,
            endMs,
            durationMs,
            blob,
            mimeType: blob.type || 'audio/webm',
            sizeBytes: blob.size,
            syncStatus: 'pending',
            cloudinaryUrl: null,
            cloudinaryPublicId: null,
            uploadAttempts: 0,
            lastAttemptAt: null,
            lastError: null,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            sentAt: null,
          };

          await writeAudioChunk(audioChunk);

          // Update session totals
          const session = await getLocalSession(sessionId);
          if (session) {
            session.totalAudioChunks = audioChunkIndex + 1;
            await updateLocalSession(session);
          }

          audioChunkIndex++;
        }
      } catch (err) {
        postError(`AUDIO_CHUNK write: ${err}`);
      }
      break;
    }

    case 'MEDIA_SHOW': {
      const { mediaId, name, mediaType, url, timerDisplay, elapsedMs, frameIndex } = msg;

      // Close any still-open instance of the same asset in this batch
      const prev = batchMediaActions.find(m => m.id === mediaId && m.closed === null);
      if (prev) prev.closed = timerDisplay;

      batchMediaActions.push({
        id:     mediaId,
        name,
        type:   mediaType as 'video' | 'pdf' | 'image',
        url,
        show:   timerDisplay,
        showMs: elapsedMs,
        closed: null,
        frameIndex,
      });
      break;
    }

    case 'PDF_PAGE': {
      const { mediaId, page, timerDisplay, elapsedMs } = msg;
      // Find the active media entry in current batch or previous batches
      const active = batchMediaActions.find(m => m.id === mediaId && m.closed === null);
      if (active) {
        if (!active.pdfPages) active.pdfPages = [];
        active.pdfPages.push({ page, timerDisplay, elapsedMs });
      } else {
        // Media spans a previous batch — append to the most recent open entry there
        for (let i = manifest.batches.length - 1; i >= 0; i--) {
          const prev = manifest.batches[i].mediaAction?.find(m => m.id === mediaId && m.closed === null);
          if (prev) {
            if (!prev.pdfPages) prev.pdfPages = [];
            prev.pdfPages.push({ page, timerDisplay, elapsedMs });
            break;
          }
        }
      }
      break;
    }

    case 'MEDIA_SCROLL': {
      const { mediaId, scrollRatio, timerDisplay, elapsedMs } = msg;
      const event = { scrollRatio, timerDisplay, elapsedMs };

      const active = batchMediaActions.find(m => m.id === mediaId && m.closed === null);
      if (active) {
        if (!active.pdfScrollEvents) active.pdfScrollEvents = [];
        active.pdfScrollEvents.push(event);
      } else {
        for (let i = manifest.batches.length - 1; i >= 0; i--) {
          const prev = manifest.batches[i].mediaAction?.find(m => m.id === mediaId && m.closed === null);
          if (prev) {
            if (!prev.pdfScrollEvents) prev.pdfScrollEvents = [];
            prev.pdfScrollEvents.push(event);
            break;
          }
        }
      }
      break;
    }

    case 'MEDIA_PLAYBACK': {
      const { mediaId, state, timerDisplay, elapsedMs } = msg;
      const event = { state, timerDisplay, elapsedMs };

      const active = batchMediaActions.find(m => m.id === mediaId && m.closed === null);
      if (active) {
        if (!active.playbackEvents) active.playbackEvents = [];
        active.playbackEvents.push(event);
      } else {
        for (let i = manifest.batches.length - 1; i >= 0; i--) {
          const prev = manifest.batches[i].mediaAction?.find(m => m.id === mediaId && m.closed === null);
          if (prev) {
            if (!prev.playbackEvents) prev.playbackEvents = [];
            prev.playbackEvents.push(event);
            break;
          }
        }
      }
      break;
    }

    case 'MEDIA_HIDE': {
      const { mediaId, timerDisplay, elapsedMs } = msg;

      // Try current batch first, then search previous batches
      const current = batchMediaActions.find(m => m.id === mediaId && m.closed === null);
      if (current) {
        current.closed = timerDisplay;
        current.closedMs = elapsedMs;
      } else {
        for (const batch of manifest.batches) {
          const prev = batch.mediaAction?.find(m => m.id === mediaId && m.closed === null);
          if (prev) {
            prev.closed = timerDisplay;
            prev.closedMs = elapsedMs;
            break;
          }
        }
      }
      break;
    }

    case 'BOARD_SWITCH': {
      const { fromBoard, toBoard, elapsedMs } = msg;
      boardEventsList.push({
        id: crypto.randomUUID(),
        type: 'switch',
        timestampMs: elapsedMs,
        fromBoard,
        toBoard,
      });
      break;
    }

    case 'PAUSE': {
      // elapsedMs available in msg if needed for tracking
      void msg;
      if (!isPaused) {
        isPaused = true;
        pauseStartMs = Date.now();

        // Stop the batch timer while paused
        if (batchTimer) {
          clearTimeout(batchTimer);
          batchTimer = null;
        }

        // Update session status
        if (sessionMetadata) {
          const session = await getLocalSession(sessionId);
          if (session) {
            session.status = 'paused';
            await updateLocalSession(session);
          }
        }
      }
      break;
    }

    case 'RESUME': {
      if (isPaused) {
        const pauseDuration = Date.now() - pauseStartMs;
        pausedDurationMs += pauseDuration;
        isPaused = false;
        pauseStartMs = 0;

        // Adjust sessionStartMs to account for pause duration
        // This keeps the batch boundaries aligned
        sessionStartMs += pauseDuration;

        // Resume the batch timer
        scheduleNextBatch();

        // Update session status
        if (sessionMetadata) {
          const session = await getLocalSession(sessionId);
          if (session) {
            session.status = 'recording';
            session.recording.pausedDurationMs = pausedDurationMs;
            await updateLocalSession(session);
          }
        }
      }
      break;
    }

    case 'END': {
      if (batchTimer) clearTimeout(batchTimer);

      // Strokes are already in IDB — just finalise the manifest.
      // Close any media still open at session end.
      const elapsedSecs = Math.ceil(Math.max(0, Date.now() - sessionStartMs) / 1000);
      const endClock = secondsToClock(elapsedSecs);
      batchMediaActions.forEach(m => { if (!m.closed) m.closed = endClock; });

      // Also close any still-open media stored in already-flushed batches.
      for (const batch of manifest.batches) {
        for (const media of batch.mediaAction ?? []) {
          if (!media.closed || media.closed === '—') {
            media.closed = endClock;
          }
        }
      }

      // If class ended before the next 10s tick, flush a final partial batch
      // so media open/close actions are not lost from the manifest.
      if (hasStrokesInBatch || batchMediaActions.length > 0) {
        const startVal = currentSlot * 10;
        const endVal = Math.max(startVal + 1, elapsedSecs);

        const batch: IBatch = {
          id:        crypto.randomUUID(),
          startTime: String(startVal),
          endTime:   String(endVal),
          hasAudio:  true,
          hasBoard:  hasStrokesInBatch,
          ...(batchMediaActions.length > 0
            ? { mediaAction: batchMediaActions.slice() }
            : {}),
        };

        manifest.batches.push(batch);
        manifest.totalBatches  = manifest.batches.length;
        manifest.totalDuration = BATCH_MS * manifest.totalBatches;
      }

      // Flush any remaining strokes/board-events for sync architecture.
      // Also flush when there are board events after the last stroke flush
      // (e.g. teacher switched boards at the end without drawing anything).
      if (sessionMetadata) {
        const pendingBatchStart = uploadBatchIndex * UPLOAD_BATCH_MS;
        const pendingBatchEnd = pendingBatchStart + UPLOAD_BATCH_MS;
        const hasPendingBoardEvents = boardEventsList.some(
          e => e.timestampMs >= pendingBatchStart && e.timestampMs < pendingBatchEnd
        );
        if (currentUploadBatchStrokes.length > 0 || hasPendingBoardEvents) {
          await flushUploadStrokeBatch(true);
        }
      }

      // Update session to completed status
      if (sessionMetadata) {
        const session = await getLocalSession(sessionId);
        if (session) {
          const totalDurationMs = Date.now() - sessionStartMs - pausedDurationMs;
          session.status = 'completed';
          session.recording.endedAt = new Date().toISOString();
          session.recording.totalDurationMs = totalDurationMs;
          session.recording.pausedDurationMs = pausedDurationMs;
          session.mediaEvents = extractAllMediaEvents(manifest);
          session.boardEvents = boardEventsList.slice();
          await updateLocalSession(session);
        }
      }

      // Emit final manifest
      self.postMessage({ type: 'MANIFEST_UPDATE', manifest: JSON.stringify(manifest) });
      self.postMessage({ type: 'SESSION_COMPLETE', sessionId });
      break;
    }
  }
};

function postError(msg: string) {
  console.error('[SessionWorker]', msg);
  self.postMessage({ type: 'ERROR', error: msg });
}

// Extract all media events from manifest batches for LocalSession
function extractAllMediaEvents(m: typeof manifest): IActiveMedia[] {
  const events: IActiveMedia[] = [];
  for (const batch of m.batches) {
    if (batch.mediaAction) {
      events.push(...batch.mediaAction);
    }
  }
  return events;
}
