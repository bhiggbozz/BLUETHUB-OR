/// <reference lib="webworker" />
/**
 * Sync Worker — Handles background upload of recorded class data
 *
 * Responsibilities:
 * - Upload audio chunks to Cloudinary
 * - Upload stroke batches to backend
 * - Upload final manifest
 * - Track sync status in IndexedDB
 * - Handle network changes and retries
 * - Clean up after successful sync
 */

import { openDB, type IDBPDatabase } from 'idb';
import { upgradeBluethubClassroomDb } from '@/utils/db-schema';
import {
  DB_NAME, DB_VERSION,
  STORE_SESSIONS, STORE_AUDIO_CHUNKS, STORE_STROKE_BATCHES,
  type LocalSession, type LocalAudioChunk, type LocalStrokeBatch,
  type SyncStatus, type SessionManifest, type CloudinaryUploadConfig,
  type IActiveMedia,
} from '@/utils/constant';

// ── Message Types ─────────────────────────────────────────────────────────────

type ToWorkerMsg =
  | {
      type: 'START_SYNC';
      sessionId: string;
      lessonId: string;
      cloudinaryConfig: CloudinaryUploadConfig;
      authToken: string;
      tenantId: string;
      apiBaseUrl: string;
    }
  | { type: 'PAUSE_SYNC' }
  | { type: 'RESUME_SYNC' }
  | { type: 'CANCEL_SYNC' }
  | { type: 'CLEANUP'; sessionId: string }
  | { type: 'GET_STATUS'; sessionId: string };

type FromWorkerMsg =
  | { type: 'READY' }
  | { type: 'PROGRESS'; phase: 'audio' | 'strokes' | 'manifest'; current: number; total: number }
  | { type: 'CHUNK_STATUS'; chunkType: 'audio' | 'strokes'; chunkIndex: number; status: SyncStatus; error?: string }
  | { type: 'OFFLINE'; message: string }
  | { type: 'ONLINE'; message: string }
  | { type: 'COMPLETE'; sessionId: string }
  | { type: 'ERROR'; error: string; recoverable: boolean }
  | { type: 'CLEANUP_COMPLETE'; freedBytes: number }
  | { type: 'STATUS'; stats: SyncStats };

interface SyncStats {
  totalAudio: number;
  audioSent: number;
  audioPending: number;
  audioFailed: number;
  totalStrokes: number;
  strokesSent: number;
  strokesPending: number;
  strokesFailed: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const CHUNK_DURATION_MS = 60000; // 1 minute chunks

// ── State ─────────────────────────────────────────────────────────────────────

let db: IDBPDatabase | null = null;
let isPaused = false;
let isCancelled = false;
let currentSessionId: string | null = null;
let currentConfig: {
  authToken: string;
  tenantId: string;
  apiBaseUrl: string;
  cloudinaryConfig: CloudinaryUploadConfig;
} | null = null;

// ── Database ──────────────────────────────────────────────────────────────────

async function getDb(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, { upgrade: upgradeBluethubClassroomDb });
  // Self-close on a version-change request from elsewhere (e.g. a recovery
  // delete after a schema-drift error) so this connection never blocks it.
  db.onclose = () => { db = null; };
  db.onversionchange = () => { db?.close(); db = null; };
  return db;
}

// ── Network Check ─────────────────────────────────────────────────────────────

function isOnline(): boolean {
  return navigator.onLine;
}

async function waitForOnline(): Promise<void> {
  if (isOnline()) return;

  postMessage({ type: 'OFFLINE', message: 'Waiting for network connection...' } as FromWorkerMsg);

  return new Promise((resolve) => {
    const checkOnline = () => {
      if (navigator.onLine) {
        self.removeEventListener('online', checkOnline);
        postMessage({ type: 'ONLINE', message: 'Network restored, resuming sync...' } as FromWorkerMsg);
        resolve();
      }
    };
    self.addEventListener('online', checkOnline);
  });
}

// ── Status Updates in IndexedDB ───────────────────────────────────────────────

async function updateAudioChunkStatus(
  chunkId: string,
  status: SyncStatus,
  extras?: Partial<LocalAudioChunk>
): Promise<void> {
  const database = await getDb();
  const chunk = await database.get(STORE_AUDIO_CHUNKS, chunkId);
  if (!chunk) return;

  await database.put(STORE_AUDIO_CHUNKS, {
    ...chunk,
    syncStatus: status,
    lastAttemptAt: new Date().toISOString(),
    uploadAttempts: status === 'failed' ? chunk.uploadAttempts + 1 : chunk.uploadAttempts,
    sentAt: status === 'sent' ? new Date().toISOString() : chunk.sentAt,
    lastError: status === 'sent' ? null : chunk.lastError,
    ...extras,
  });
}

async function updateStrokeBatchStatus(
  batchId: string,
  status: SyncStatus,
  extras?: Partial<LocalStrokeBatch>
): Promise<void> {
  const database = await getDb();
  const batch = await database.get(STORE_STROKE_BATCHES, batchId);
  if (!batch) return;

  await database.put(STORE_STROKE_BATCHES, {
    ...batch,
    syncStatus: status,
    lastAttemptAt: new Date().toISOString(),
    uploadAttempts: status === 'failed' ? batch.uploadAttempts + 1 : batch.uploadAttempts,
    sentAt: status === 'sent' ? new Date().toISOString() : batch.sentAt,
    lastError: status === 'sent' ? null : batch.lastError,
    ...extras,
  });
}

async function updateSessionStatus(sessionId: string, status: string): Promise<void> {
  const database = await getDb();
  const session = await database.get(STORE_SESSIONS, sessionId);
  if (!session) return;

  await database.put(STORE_SESSIONS, {
    ...session,
    status,
    modifiedAt: new Date().toISOString(),
  });
}

async function updateSessionSyncProgress(sessionId: string): Promise<void> {
  const database = await getDb();
  const session = await database.get(STORE_SESSIONS, sessionId);
  if (!session) return;

  const audioChunks = await database.getAllFromIndex(STORE_AUDIO_CHUNKS, 'sessionId', sessionId);
  const strokeBatches = await database.getAllFromIndex(STORE_STROKE_BATCHES, 'sessionId', sessionId);

  const audioSent = audioChunks.filter((c: LocalAudioChunk) => c.syncStatus === 'sent').length;
  const audioFailed = audioChunks.filter((c: LocalAudioChunk) => c.syncStatus === 'failed').length;
  const strokesSent = strokeBatches.filter((b: LocalStrokeBatch) => b.syncStatus === 'sent').length;
  const strokesFailed = strokeBatches.filter((b: LocalStrokeBatch) => b.syncStatus === 'failed').length;

  await database.put(STORE_SESSIONS, {
    ...session,
    syncProgress: {
      ...session.syncProgress,
      audioSent,
      audioFailed,
      strokesSent,
      strokesFailed,
    },
    modifiedAt: new Date().toISOString(),
  });
}

// ── Cloudinary Upload ─────────────────────────────────────────────────────────

async function uploadToCloudinary(
  blob: Blob,
  config: CloudinaryUploadConfig,
  publicId: string
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('api_key', config.apiKey);
  formData.append('timestamp', String(config.timestamp));
  formData.append('signature', config.signature);
  formData.append('folder', config.folder);
  formData.append('public_id', publicId);
  if (config.uploadPreset) formData.append('upload_preset', config.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${config.resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

// ── Backend API Calls ─────────────────────────────────────────────────────────

async function uploadAudioMetadataToBackend(
  lessonId: string,
  chunk: LocalAudioChunk
): Promise<void> {
  if (!currentConfig) throw new Error('No config available');

  const response = await fetch(
    `${currentConfig.apiBaseUrl}/api/lessons/${lessonId}/session/audio/${chunk.chunkIndex}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentConfig.authToken}`,
        'X-Tenant-ID': currentConfig.tenantId,
      },
      body: JSON.stringify({
        chunkIndex: chunk.chunkIndex,
        startMs: chunk.startMs,
        endMs: chunk.endMs,
        durationMs: chunk.durationMs,
        cloudinaryUrl: chunk.cloudinaryUrl,
        cloudinaryPublicId: chunk.cloudinaryPublicId,
        sizeBytes: chunk.sizeBytes,
      }),
    }
  );

  // 204 = success (event-based, no content returned)
  if (response.status !== 204 && !response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend audio metadata upload failed: ${response.status} - ${errorText}`);
  }
}

async function uploadStrokeBatchToBackend(
  lessonId: string,
  batch: LocalStrokeBatch
): Promise<void> {
  if (!currentConfig) throw new Error('No config available');

  const response = await fetch(
    `${currentConfig.apiBaseUrl}/api/lessons/${lessonId}/session/strokes/${batch.batchIndex}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentConfig.authToken}`,
        'X-Tenant-ID': currentConfig.tenantId,
      },
      body: JSON.stringify({
        batchIndex: batch.batchIndex,
        startMs: batch.startMs,
        endMs: batch.endMs,
        strokeCount: batch.strokeCount,
        strokes: batch.strokes,
        sizeBytes: batch.sizeBytes,
        boardSwitches: batch.boardSwitches ?? [],
      }),
    }
  );

  // 204 = success
  if (response.status !== 204 && !response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend stroke batch upload failed: ${response.status} - ${errorText}`);
  }
}

async function uploadManifestToBackend(
  lessonId: string,
  sessionId: string,
  manifest: SessionManifest
): Promise<void> {
  if (!currentConfig) throw new Error('No config available');

  const response = await fetch(
    `${currentConfig.apiBaseUrl}/api/lessons/${lessonId}/session/complete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentConfig.authToken}`,
        'X-Tenant-ID': currentConfig.tenantId,
      },
      body: JSON.stringify({
        sessionId,
        manifest,
      }),
    }
  );

  // 204 = success
  if (response.status !== 204 && !response.ok) {
    const errorText = await response.text();
    throw new Error(`Manifest upload failed: ${response.status} - ${errorText}`);
  }
}

// ── Build Manifest ────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function extractUniqueMediaAssets(mediaEvents: IActiveMedia[]): Array<{ id: string; name: string; type: string; url: string }> {
  const seen = new Set<string>();
  return mediaEvents
    .filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      url: e.url,
    }));
}

function buildManifest(
  session: LocalSession,
  audioChunks: LocalAudioChunk[],
  strokeBatches: LocalStrokeBatch[]
): SessionManifest {
  const sentAudio = audioChunks
    .filter(c => c.syncStatus === 'sent' && !c.isDeleted)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);

  const sentStrokes = strokeBatches
    .filter(b => b.syncStatus === 'sent')
    .sort((a, b) => a.batchIndex - b.batchIndex);

  // Build chunks array matching audio to strokes
  const chunks = sentAudio.map(audio => {
    const strokes = sentStrokes.find(b => b.batchIndex === audio.chunkIndex);

    // Collect events for this time range
    const events: Array<{ type: string; timestampMs: number; [key: string]: unknown }> = [];

    // Add media events.
    // Emit a 'media:show' event in the chunk where showMs falls, and a
    // separate 'media:hide' event in the chunk where closedMs falls (which
    // may be a different chunk than the show event).
    session.mediaEvents.forEach(e => {
      const showMs = e.showMs ?? 0;
      if (showMs >= audio.startMs && showMs < audio.endMs) {
        events.push({
          type: 'media:show',
          timestampMs: showMs,
          mediaAssetId: e.id,
          frameIndex: e.frameIndex,
        });
      }
      // Emit hide event in the chunk containing closedMs (independent of show chunk).
      const closedMs = e.closedMs;
      if (typeof closedMs === 'number' && closedMs > 0 &&
          closedMs >= audio.startMs && closedMs < audio.endMs) {
        events.push({
          type: 'media:hide',
          timestampMs: closedMs,
          mediaAssetId: e.id,
        });
      }
    });

    // Add board events
    session.boardEvents
      .filter(e => e.timestampMs >= audio.startMs && e.timestampMs < audio.endMs)
      .forEach(e => {
        events.push({
          type: 'board:switch',
          timestampMs: e.timestampMs,
          fromBoard: e.fromBoard,
          toBoard: e.toBoard,
        });
      });

    // Sort events by timestamp
    events.sort((a, b) => a.timestampMs - b.timestampMs);

    return {
      index: audio.chunkIndex,
      startMs: audio.startMs,
      endMs: audio.endMs,
      audio: {
        url: audio.cloudinaryUrl!,
        sizeBytes: audio.sizeBytes,
        durationMs: audio.durationMs,
      },
      strokes: strokes ? {
        count: strokes.strokeCount,
        sizeBytes: strokes.sizeBytes,
      } : null,
      events,
    };
  });

  // Count unique boards
  const boardIndices = new Set<number>();
  sentStrokes.forEach(b => {
    b.strokes.forEach(s => boardIndices.add(s.currentBoard));
  });

  return {
    version: '2.0',

    session: {
      id: session.id,
      lessonId: session.lessonId,
      schoolId: session.schoolId,
      recordedAt: session.recording.startedAt,
      publishedAt: new Date().toISOString(),
      teacher: {
        id: session.teacher.id,
        name: session.teacher.name,
      },
    },

    lesson: {
      topic: session.lesson.topic,
      subTopic: session.lesson.subTopic,
      aim: session.lesson.aim,
      subject: {
        id: session.lesson.subjectId,
        name: session.lesson.subjectName,
      },
      classroom: {
        id: session.lesson.classroomId,
        name: session.lesson.className,
      },
    },

    stats: {
      totalDurationMs: session.recording.totalDurationMs,
      totalDurationFormatted: formatDuration(session.recording.totalDurationMs),
      chunkCount: sentAudio.length,
      chunkDurationMs: CHUNK_DURATION_MS,
      totalAudioSizeBytes: sentAudio.reduce((sum, c) => sum + c.sizeBytes, 0),
      totalStrokeCount: sentStrokes.reduce((sum, b) => sum + b.strokeCount, 0),
      boardCount: boardIndices.size,
    },

    chunks,

    mediaAssets: extractUniqueMediaAssets(session.mediaEvents),

    boards: Array.from(boardIndices).sort().map(index => ({
      index,
      dimensions: {
        width: session.recording.screenWidth,
        height: session.recording.screenHeight,
      },
      strokeCount: sentStrokes
        .flatMap(b => b.strokes)
        .filter(s => s.currentBoard === index)
        .length,
    })),

    chapters: session.adjustments.chapters,
  };
}

// ── Main Sync Logic ───────────────────────────────────────────────────────────

async function syncSession(
  sessionId: string,
  lessonId: string,
  cloudinaryConfig: CloudinaryUploadConfig,
  authToken: string,
  tenantId: string,
  apiBaseUrl: string
): Promise<void> {
  const database = await getDb();
  currentSessionId = sessionId;
  currentConfig = { authToken, tenantId, apiBaseUrl, cloudinaryConfig };

  // Update session status to publishing
  await updateSessionStatus(sessionId, 'publishing');

  // ═══ PHASE 1: Upload Audio Chunks to Cloudinary ═══

  const allAudioChunks = await database.getAllFromIndex(STORE_AUDIO_CHUNKS, 'sessionId', sessionId);
  const pendingAudio = allAudioChunks
    .filter((c: LocalAudioChunk) =>
      (c.syncStatus === 'pending' || c.syncStatus === 'failed') &&
      !c.isDeleted &&
      c.uploadAttempts < MAX_RETRIES
    )
    .sort((a: LocalAudioChunk, b: LocalAudioChunk) => a.chunkIndex - b.chunkIndex);

  const totalAudio = pendingAudio.length;
  let audioUploaded = 0;

  for (const chunk of pendingAudio) {
    if (isPaused) {
      postMessage({ type: 'OFFLINE', message: 'Sync paused' } as FromWorkerMsg);
      return;
    }
    if (isCancelled) {
      postMessage({ type: 'ERROR', error: 'Sync cancelled', recoverable: true } as FromWorkerMsg);
      return;
    }

    // Check network
    await waitForOnline();

    try {
      // Update status to uploading
      await updateAudioChunkStatus(chunk.id, 'uploading');
      postMessage({
        type: 'CHUNK_STATUS',
        chunkType: 'audio',
        chunkIndex: chunk.chunkIndex,
        status: 'uploading',
      } as FromWorkerMsg);

      // Upload to Cloudinary
      const publicId = `${sessionId}/audio_${chunk.chunkIndex}`;
      const { url, publicId: returnedId } = await uploadToCloudinary(
        chunk.blob,
        cloudinaryConfig,
        publicId
      );

      // Update chunk with Cloudinary URL
      const updatedChunk: LocalAudioChunk = {
        ...chunk,
        cloudinaryUrl: url,
        cloudinaryPublicId: returnedId,
      };

      // Upload metadata to backend
      await uploadAudioMetadataToBackend(lessonId, updatedChunk);

      // Mark as sent
      await updateAudioChunkStatus(chunk.id, 'sent', {
        cloudinaryUrl: url,
        cloudinaryPublicId: returnedId,
        lastError: null,
      });

      audioUploaded++;
      postMessage({
        type: 'PROGRESS',
        phase: 'audio',
        current: audioUploaded,
        total: totalAudio,
      } as FromWorkerMsg);
      postMessage({
        type: 'CHUNK_STATUS',
        chunkType: 'audio',
        chunkIndex: chunk.chunkIndex,
        status: 'sent',
      } as FromWorkerMsg);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await updateAudioChunkStatus(chunk.id, 'failed', { lastError: errorMsg });
      postMessage({
        type: 'CHUNK_STATUS',
        chunkType: 'audio',
        chunkIndex: chunk.chunkIndex,
        status: 'failed',
        error: errorMsg,
      } as FromWorkerMsg);

      // Retry after delay if attempts remaining
      if (chunk.uploadAttempts < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }

    // Update session progress
    await updateSessionSyncProgress(sessionId);
  }

  if (isCancelled) return;

  // ═══ PHASE 2: Upload Stroke Batches to Backend ═══

  const allStrokeBatches = await database.getAllFromIndex(STORE_STROKE_BATCHES, 'sessionId', sessionId);
  const pendingStrokes = allStrokeBatches
    .filter((b: LocalStrokeBatch) =>
      (b.syncStatus === 'pending' || b.syncStatus === 'failed') &&
      b.uploadAttempts < MAX_RETRIES
    )
    .sort((a: LocalStrokeBatch, b: LocalStrokeBatch) => a.batchIndex - b.batchIndex);

  const totalStrokes = pendingStrokes.length;
  let strokesUploaded = 0;

  for (const batch of pendingStrokes) {
    if (isPaused || isCancelled) break;

    await waitForOnline();

    try {
      await updateStrokeBatchStatus(batch.id, 'uploading');
      postMessage({
        type: 'CHUNK_STATUS',
        chunkType: 'strokes',
        chunkIndex: batch.batchIndex,
        status: 'uploading',
      } as FromWorkerMsg);

      await uploadStrokeBatchToBackend(lessonId, batch);

      await updateStrokeBatchStatus(batch.id, 'sent', { lastError: null });

      strokesUploaded++;
      postMessage({
        type: 'PROGRESS',
        phase: 'strokes',
        current: strokesUploaded,
        total: totalStrokes,
      } as FromWorkerMsg);
      postMessage({
        type: 'CHUNK_STATUS',
        chunkType: 'strokes',
        chunkIndex: batch.batchIndex,
        status: 'sent',
      } as FromWorkerMsg);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await updateStrokeBatchStatus(batch.id, 'failed', { lastError: errorMsg });
      postMessage({
        type: 'CHUNK_STATUS',
        chunkType: 'strokes',
        chunkIndex: batch.batchIndex,
        status: 'failed',
        error: errorMsg,
      } as FromWorkerMsg);

      if (batch.uploadAttempts < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }

    await updateSessionSyncProgress(sessionId);
  }

  if (isCancelled) return;

  // ═══ PHASE 3: Upload Final Manifest ═══

  await waitForOnline();

  postMessage({ type: 'PROGRESS', phase: 'manifest', current: 0, total: 1 } as FromWorkerMsg);

  try {
    const session = await database.get(STORE_SESSIONS, sessionId);
    if (!session) throw new Error('Session not found');

    const audioChunks = await database.getAllFromIndex(STORE_AUDIO_CHUNKS, 'sessionId', sessionId);
    const strokeBatches = await database.getAllFromIndex(STORE_STROKE_BATCHES, 'sessionId', sessionId);

    // Check if we have enough sent chunks
    const sentAudioCount = audioChunks.filter((c: LocalAudioChunk) => c.syncStatus === 'sent').length;
    // Note: stroke batches may be empty for a lecture-only class, no validation needed
    void strokeBatches.filter((b: LocalStrokeBatch) => b.syncStatus === 'sent').length;

    if (sentAudioCount === 0) {
      throw new Error('No audio chunks uploaded successfully');
    }

    // Build manifest
    const manifest = buildManifest(session, audioChunks, strokeBatches);

    await uploadManifestToBackend(lessonId, sessionId, manifest);

    // Update session status to published
    const updatedSession: LocalSession = {
      ...session,
      status: 'published',
      syncProgress: {
        ...session.syncProgress,
        manifestSent: true,
      },
      modifiedAt: new Date().toISOString(),
    };
    await database.put(STORE_SESSIONS, updatedSession);

    postMessage({ type: 'PROGRESS', phase: 'manifest', current: 1, total: 1 } as FromWorkerMsg);
    postMessage({ type: 'COMPLETE', sessionId } as FromWorkerMsg);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await updateSessionStatus(sessionId, 'failed');
    postMessage({ type: 'ERROR', error: `Manifest upload failed: ${errorMsg}`, recoverable: true } as FromWorkerMsg);
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanupSession(sessionId: string): Promise<void> {
  const database = await getDb();
  let freedBytes = 0;

  // Delete sent audio chunks (large blobs)
  const audioChunks = await database.getAllFromIndex(STORE_AUDIO_CHUNKS, 'sessionId', sessionId);
  const tx1 = database.transaction(STORE_AUDIO_CHUNKS, 'readwrite');
  for (const chunk of audioChunks) {
    if (chunk.syncStatus === 'sent') {
      freedBytes += chunk.sizeBytes;
      await tx1.store.delete(chunk.id);
    }
  }
  await tx1.done;

  // Delete sent stroke batches
  const strokeBatches = await database.getAllFromIndex(STORE_STROKE_BATCHES, 'sessionId', sessionId);
  const tx2 = database.transaction(STORE_STROKE_BATCHES, 'readwrite');
  for (const batch of strokeBatches) {
    if (batch.syncStatus === 'sent') {
      freedBytes += batch.sizeBytes;
      await tx2.store.delete(batch.id);
    }
  }
  await tx2.done;

  postMessage({ type: 'CLEANUP_COMPLETE', freedBytes } as FromWorkerMsg);
}

// ── Get Status ────────────────────────────────────────────────────────────────

async function getStatus(sessionId: string): Promise<void> {
  const database = await getDb();

  const audioChunks = await database.getAllFromIndex(STORE_AUDIO_CHUNKS, 'sessionId', sessionId);
  const strokeBatches = await database.getAllFromIndex(STORE_STROKE_BATCHES, 'sessionId', sessionId);

  const stats: SyncStats = {
    totalAudio: audioChunks.length,
    audioSent: audioChunks.filter((c: LocalAudioChunk) => c.syncStatus === 'sent').length,
    audioPending: audioChunks.filter((c: LocalAudioChunk) => c.syncStatus === 'pending').length,
    audioFailed: audioChunks.filter((c: LocalAudioChunk) => c.syncStatus === 'failed').length,
    totalStrokes: strokeBatches.length,
    strokesSent: strokeBatches.filter((b: LocalStrokeBatch) => b.syncStatus === 'sent').length,
    strokesPending: strokeBatches.filter((b: LocalStrokeBatch) => b.syncStatus === 'pending').length,
    strokesFailed: strokeBatches.filter((b: LocalStrokeBatch) => b.syncStatus === 'failed').length,
  };

  postMessage({ type: 'STATUS', stats } as FromWorkerMsg);
}

// ── Message Handler ───────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<ToWorkerMsg>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'START_SYNC':
      isPaused = false;
      isCancelled = false;
      await syncSession(
        msg.sessionId,
        msg.lessonId,
        msg.cloudinaryConfig,
        msg.authToken,
        msg.tenantId,
        msg.apiBaseUrl
      );
      break;

    case 'PAUSE_SYNC':
      isPaused = true;
      break;

    case 'RESUME_SYNC':
      isPaused = false;
      // Would need to re-trigger sync with stored config
      if (currentSessionId && currentConfig) {
        // Continue from where we left off
        await syncSession(
          currentSessionId,
          currentConfig.cloudinaryConfig.folder.split('/')[1], // Extract lessonId
          currentConfig.cloudinaryConfig,
          currentConfig.authToken,
          currentConfig.tenantId,
          currentConfig.apiBaseUrl
        );
      }
      break;

    case 'CANCEL_SYNC':
      isCancelled = true;
      currentSessionId = null;
      currentConfig = null;
      break;

    case 'CLEANUP':
      await cleanupSession(msg.sessionId);
      break;

    case 'GET_STATUS':
      await getStatus(msg.sessionId);
      break;
  }
};

// ── Network Event Listeners ───────────────────────────────────────────────────

self.addEventListener('online', () => {
  postMessage({ type: 'ONLINE', message: 'Network connection restored' } as FromWorkerMsg);
});

self.addEventListener('offline', () => {
  postMessage({ type: 'OFFLINE', message: 'Network connection lost' } as FromWorkerMsg);
});

// ── Signal Ready ──────────────────────────────────────────────────────────────

postMessage({ type: 'READY' } as FromWorkerMsg);
