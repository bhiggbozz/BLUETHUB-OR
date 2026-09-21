/**
 * useSessionUpload Hook
 *
 * Handles uploading lesson recording data:
 * - Audio chunks → Cloudinary (token-based direct upload)
 * - Stroke batches → Backend MongoDB (via board session API)
 *
 * Features:
 * - Parallel uploads with concurrency control
 * - Progress tracking per chunk
 * - Retry logic for failed uploads
 * - Status updates to IndexedDB
 * - Stroke batch ID generation: sessionId_batchIndex
 */

import { useCallback, useRef, useState } from 'react';
import { mediaUploadService, type UploadProgress } from '@/services/media-upload';
import {
  boardSessionService,
  type BoardBatchPayload,
  type WireStroke,
} from '@/services/board-session';
import {
  getAudioChunksBySession,
  getStrokeBatchesBySession,
  updateAudioChunkStatus,
  updateStrokeBatchStatus,
} from '@/utils/db';
import type { LocalAudioChunk, LocalStrokeBatch, CompressedStroke } from '@/utils/constant';
import { LOCAL_BATCH_MS, UPLOAD_BATCH_MS, base64ToUint8 } from '@/utils';
import { gzipDecompress } from '@/utils/gzip';

/**
 * Converts a locally-stored, gzip-compressed stroke (CompressedStroke — the
 * shape used for IndexedDB storage/replay) into the raw wire shape the batch
 * endpoint expects. `data` decompresses back to the flat Konva points array
 * ([x1,y1,x2,y2,...]) that was compressed at capture time — pair it up into
 * [x,y] tuples for `pts`.
 */
async function toWireStroke(stroke: CompressedStroke): Promise<WireStroke> {
  const binary = base64ToUint8(stroke.data);
  const json = await gzipDecompress(binary);
  const flat: number[] = JSON.parse(json);

  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pts.push([flat[i], flat[i + 1]]);
  }

  return {
    id: stroke.id,
    pts,
    c: stroke.color,
    w: stroke.width,
    ts: stroke.timestamp,
    currentBoard: stroke.currentBoard,
    sessionId: stroke.sessionId,
  };
}

// Number of 10s chunks per 60s upload batch (kept for reference)
const _CHUNKS_PER_UPLOAD_BATCH = UPLOAD_BATCH_MS / LOCAL_BATCH_MS; // 6
void _CHUNKS_PER_UPLOAD_BATCH;

/**
 * Converts an AudioBuffer to a WAV Blob (16-bit PCM).
 * WAV is a flat PCM container — safe to construct from raw sample data,
 * unlike WebM which requires a full Matroska container with proper headers.
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numCh * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(ab);
  const ws = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + dataSize, true);
  ws(8, 'WAVE'); ws(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, numCh, true);
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * blockAlign, true);
  dv.setUint16(32, blockAlign, true); dv.setUint16(34, 16, true);
  ws(36, 'data'); dv.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

/**
 * Merge multiple audio blobs into a single blob via PCM-level concatenation.
 *
 * WHY NOT new Blob(blobs):
 *   Each WebM/Opus blob is a self-contained Matroska container with its own
 *   EBML header and cluster structure. Concatenating raw bytes produces an
 *   invalid container — decoders stop at the end of the first valid stream
 *   and silently discard everything after it. Result: only the first 10-second
 *   sub-chunk plays; the other 50 seconds are lost.
 *
 * FIX:
 *   1. Decode each blob to a raw PCM AudioBuffer with decodeAudioData().
 *   2. Copy all sample frames sequentially into one merged AudioBuffer.
 *   3. Encode the merged buffer to a WAV file (flat PCM container — no header
 *      complexity, fully seekable, universally decodable).
 */
async function mergeAudioBlobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) throw new Error('No blobs to merge');
  if (blobs.length === 1) return blobs[0];

  const tempCtx = new AudioContext();
  const decoded: AudioBuffer[] = [];

  for (const blob of blobs) {
    try {
      const ab = await blob.arrayBuffer();
      if (ab.byteLength < 32) {
        console.warn('[Upload] sub-chunk too small, skipping:', ab.byteLength, 'bytes');
        continue;
      }
      const buffer = await tempCtx.decodeAudioData(ab);
      decoded.push(buffer);
    } catch (e) {
      console.warn('[Upload] sub-chunk decode failed, skipping:', e);
    }
  }

  await tempCtx.close();

  if (decoded.length === 0) return blobs[0]; // fallback: nothing decoded, send first blob
  if (decoded.length === 1) return audioBufferToWavBlob(decoded[0]);

  const sampleRate = decoded[0].sampleRate;
  const numCh = Math.max(...decoded.map(b => b.numberOfChannels));
  const totalLength = decoded.reduce((sum, b) => sum + b.length, 0);

  const merged = new AudioBuffer({ numberOfChannels: numCh, length: totalLength, sampleRate });
  let sampleOff = 0;
  for (const buf of decoded) {
    for (let c = 0; c < numCh; c++) {
      const src = c < buf.numberOfChannels
        ? buf.getChannelData(c)
        : new Float32Array(buf.length); // silence for missing channels
      merged.copyToChannel(src, c, sampleOff);
    }
    sampleOff += buf.length;
  }

  // Previously padded every merged batch with silence up to UPLOAD_BATCH_MS
  // (60s) "so downstream consumers see no gap at batch boundaries" — but
  // replay (reply.tsx) doesn't assume fixed 60s slots; it schedules each
  // batch at the precise elapsed-time position tracked independently in the
  // manifest (chunk.audio.durationMs, from local IndexedDB timing — see
  // end-class.tsx's buildManifest). Padding the actual audio file to a flat
  // 60000ms while the manifest kept reporting the true, variable duration
  // (e.g. 57583ms for a shorter last batch) created a mismatch between what
  // replay schedules and what the file actually contains at every single
  // batch boundary — silence gaps when the manifest's slot was longer than
  // 60s, overlapping audio when it was shorter. Uploading the true,
  // unpadded duration keeps the file honest with what the manifest already
  // (correctly) says about it.
  return audioBufferToWavBlob(merged);
}

/**
 * Group audio chunks by their uploadBatchIndex
 */
function groupChunksByUploadBatch(chunks: LocalAudioChunk[]): Map<number, LocalAudioChunk[]> {
  const groups = new Map<number, LocalAudioChunk[]>();
  for (const chunk of chunks) {
    const batchIdx = chunk.uploadBatchIndex;
    if (!groups.has(batchIdx)) {
      groups.set(batchIdx, []);
    }
    groups.get(batchIdx)!.push(chunk);
  }
  // Sort chunks within each group by chunkIndex
  for (const [, chunkList] of groups) {
    chunkList.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }
  return groups;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadState {
  isUploading: boolean;
  phase: 'idle' | 'audio' | 'strokes' | 'complete' | 'error';
  currentChunk: number;
  totalChunks: number;
  currentProgress: number;
  overallProgress: number;
  error: string | null;
  uploadedAudio: number;
  uploadedStrokes: number;
}

export interface UploadResults {
  audioUrls: Array<{ chunkIndex: number; url: string; mediaId: string }>;
  // Stroke batches go to MongoDB, not Cloudinary - tracked by session-scoped batch ID
  strokeBatches: Array<{ batchIndex: number; id: string; indexKey: string }>;
  success: boolean;
  errors: string[];
}

function buildStrokeBatchId(sessionId: string, batchIndex: number): string {
  return `${sessionId}_${batchIndex}`;
}

interface UploadOptions {
  concurrency?: number;
  retryAttempts?: number;
  onProgress?: (state: UploadState) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSessionUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    phase: 'idle',
    currentChunk: 0,
    totalChunks: 0,
    currentProgress: 0,
    overallProgress: 0,
    error: null,
    uploadedAudio: 0,
    uploadedStrokes: 0,
  });

  const abortRef = useRef(false);

  const updateState = useCallback((updates: Partial<UploadState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Upload a merged audio batch (multiple 10s chunks → single 60s upload)
   * All chunks in the batch share the same uploadBatchIndex
   */
  const uploadMergedAudioBatch = useCallback(async (
    chunks: LocalAudioChunk[],
    sessionId: string,
    uploadBatchIdx: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; url?: string; mediaId?: string; error?: string; chunkIds: string[] }> => {
    const maxRetries = 3;
    let lastError = '';
    const chunkIds = chunks.map(c => c.id);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (abortRef.current) {
        return { success: false, error: 'Upload aborted', chunkIds };
      }

      try {
        // Merge all blobs in this batch into one
        const mergedBlob = await mergeAudioBlobs(chunks.map(c => c.blob));

        const result = await mediaUploadService.uploadAudio(
          mergedBlob,
          sessionId,
          uploadBatchIdx, // Use upload batch index (0, 1, 2...) not local chunk index
          onProgress
        );

        if (result.success && result.cdnUrl && result.mediaId) {
          // Update ALL chunks in this batch with success
          for (const chunk of chunks) {
            await updateAudioChunkStatus(chunk.id, 'sent', {
              cloudinaryUrl: result.cdnUrl,
              cloudinaryPublicId: result.mediaId,
            });
          }
          return { success: true, url: result.cdnUrl, mediaId: result.mediaId, chunkIds };
        }

        lastError = result.error || 'Upload failed';
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // Update ALL chunks in this batch with failure
    for (const chunk of chunks) {
      await updateAudioChunkStatus(chunk.id, 'failed', { lastError });
    }
    return { success: false, error: lastError, chunkIds };
  }, []);

  /**
   * Upload a single stroke batch to backend MongoDB with retry logic
   * Stroke batch ID format: sessionId_batchIndex (e.g., "session-123_0")
   */
  const uploadStrokeBatch = useCallback(async (
    batch: LocalStrokeBatch,
    sessionId: string,
    _onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; id?: string; indexKey?: string; error?: string }> => {
    const maxRetries = 3;
    let lastError = '';

    const strokeBatchId = buildStrokeBatchId(sessionId, batch.batchIndex);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (abortRef.current) {
        return { success: false, error: 'Upload aborted' };
      }

      try {
        // Teacher-only now — a student recording study-group content uses
        // its own dedicated useStudentSessionUpload, which always targets
        // the group-content endpoint.
        const wireStrokes = await Promise.all(batch.strokes.map(toWireStroke));

        const payload: BoardBatchPayload = {
          sessionId,
          lessonId: batch.lessonId,
          batchIndex: batch.batchIndex,
          startMs: batch.startMs,
          endMs: batch.endMs,
          strokes: wireStrokes,
          strokeCount: batch.strokeCount,
          sizeBytes: batch.sizeBytes,
          boardIndex: batch.strokes[0]?.currentBoard ?? 0,
          boardSwitches: batch.boardSwitches,
          audioUrl: null,
        };

        // Submit to backend (returns 204 No Content on success)
        await boardSessionService.submitBatch(sessionId, payload);

        // Persist the backend-facing identifier so manifest assembly can reuse it later.
        await updateStrokeBatchStatus(batch.id, 'sent', {
          indexKey: strokeBatchId,
        });
        return { success: true, id: strokeBatchId, indexKey: strokeBatchId };
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // Update local DB with failure
    await updateStrokeBatchStatus(batch.id, 'failed', { lastError });
    return { success: false, error: lastError };
  }, []);

  /**
   * Upload all session data (audio + strokes) with progress tracking
   */
  const uploadSession = useCallback(async (
    sessionId: string,
    options: UploadOptions = {}
  ): Promise<UploadResults> => {
    const { concurrency = 2, onProgress } = options;
    abortRef.current = false;

    const results: UploadResults = {
      audioUrls: [],
      strokeBatches: [],
      success: true,
      errors: [],
    };

    try {
      // Get pending chunks from IndexedDB
      const audioChunks = await getAudioChunksBySession(sessionId);
      const strokeBatches = await getStrokeBatchesBySession(sessionId);

      // Filter to pending or failed items (for retry capability)
      const pendingAudio = audioChunks.filter(c => c.syncStatus === 'pending' || c.syncStatus === 'failed');
      const pendingStrokes = strokeBatches.filter(b => b.syncStatus === 'pending' || b.syncStatus === 'failed');

      // Group audio chunks by uploadBatchIndex (6 x 10s chunks → 1 x 60s upload)
      const audioUploadGroups = groupChunksByUploadBatch(pendingAudio);
      const uploadBatchIndices = Array.from(audioUploadGroups.keys()).sort((a, b) => a - b);

      // Total items: merged audio batches + stroke batches
      const totalItems = uploadBatchIndices.length + pendingStrokes.length;

      updateState({
        isUploading: true,
        phase: 'audio',
        totalChunks: totalItems,
        currentChunk: 0,
        overallProgress: 0,
        error: null,
        uploadedAudio: 0,
        uploadedStrokes: 0,
      });

      if (onProgress) onProgress(state);

      // Upload merged audio batches (60s each, containing 6 x 10s chunks)
      let uploadedAudioBatches = 0;
      for (let i = 0; i < uploadBatchIndices.length; i += concurrency) {
        if (abortRef.current) break;

        const batchSlice = uploadBatchIndices.slice(i, i + concurrency);
        const uploadPromises = batchSlice.map((uploadBatchIdx, idx) => {
          const chunksInBatch = audioUploadGroups.get(uploadBatchIdx) ?? [];
          return uploadMergedAudioBatch(chunksInBatch, sessionId, uploadBatchIdx, (progress) => {
            updateState({
              currentChunk: i + idx + 1,
              currentProgress: progress.percentage,
              overallProgress: Math.round(((i + idx + progress.percentage / 100) / totalItems) * 100),
            });
          });
        });

        const batchResults = await Promise.all(uploadPromises);

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const uploadBatchIdx = batchSlice[j];
          if (result.success && result.url && result.mediaId) {
            results.audioUrls.push({
              chunkIndex: uploadBatchIdx, // Use upload batch index (60s granularity)
              url: result.url,
              mediaId: result.mediaId,
            });
            uploadedAudioBatches++;
          } else if (result.error) {
            results.errors.push(`Audio batch ${uploadBatchIdx}: ${result.error}`);
            results.success = false;
          }
        }

        updateState({ uploadedAudio: uploadedAudioBatches });
      }

      // Upload stroke batches to backend MongoDB
      updateState({ phase: 'strokes' });

      let uploadedStrokes = 0;
      for (let i = 0; i < pendingStrokes.length; i += concurrency) {
        if (abortRef.current) break;

        const batch = pendingStrokes.slice(i, i + concurrency);
        const uploadPromises = batch.map((strokeBatch, idx) =>
          uploadStrokeBatch(strokeBatch, sessionId, () => {
            // Stroke uploads to backend don't have granular progress
            // Update overall progress based on batch completion
            const audioOffset = pendingAudio.length;
            updateState({
              currentChunk: audioOffset + i + idx + 1,
              currentProgress: 100,
              overallProgress: Math.round(((audioOffset + i + idx + 1) / totalItems) * 100),
            });
          })
        );

        const batchResults = await Promise.all(uploadPromises);

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const originalBatch = batch[j];
          if (result.success && result.id && result.indexKey) {
            results.strokeBatches.push({
              batchIndex: originalBatch.batchIndex,
              id: result.id,
              indexKey: result.indexKey,
            });
            uploadedStrokes++;
          } else if (result.error) {
            results.errors.push(`Stroke batch ${originalBatch.batchIndex}: ${result.error}`);
            results.success = false;
          }
        }

        updateState({ uploadedStrokes });
      }

      updateState({
        isUploading: false,
        phase: results.success ? 'complete' : 'error',
        overallProgress: 100,
        error: results.errors.length > 0 ? results.errors.join('; ') : null,
      });

      return results;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Upload failed';
      updateState({
        isUploading: false,
        phase: 'error',
        error,
      });
      results.success = false;
      results.errors.push(error);
      return results;
    }
  }, [state, updateState, uploadMergedAudioBatch, uploadStrokeBatch]);

  /**
   * Abort ongoing upload
   */
  const abort = useCallback(() => {
    abortRef.current = true;
    updateState({
      isUploading: false,
      phase: 'idle',
      error: 'Upload cancelled',
    });
  }, [updateState]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    abortRef.current = false;
    setState({
      isUploading: false,
      phase: 'idle',
      currentChunk: 0,
      totalChunks: 0,
      currentProgress: 0,
      overallProgress: 0,
      error: null,
      uploadedAudio: 0,
      uploadedStrokes: 0,
    });
  }, []);

  return {
    state,
    uploadSession,
    abort,
    reset,
  };
}

export default useSessionUpload;
