/**
 * useStudentSessionUpload Hook
 *
 * Dedicated upload path for a student's study-group board recording — always
 * routes strokes to the group-content endpoint (boardSessionService.submitGroupContentBatch),
 * never the teacher's live-session endpoint. This is a deliberate fork of
 * useSessionUpload.ts rather than a shared groupId/contentId branch, so a
 * student recording's upload path can never accidentally fall through to the
 * teacher endpoint (or vice versa) if either file changes independently.
 *
 * Audio upload (Cloudinary, token-based) is identical either way — no fork
 * needed there.
 */

import { useCallback, useRef, useState } from 'react';
import { mediaUploadService, type UploadProgress } from '@/services/media-upload';
import { boardSessionService, type GroupContentBoardBatchPayload } from '@/services/board-session';
import {
  getAudioChunksBySession,
  getStrokeBatchesBySession,
  updateAudioChunkStatus,
  updateStrokeBatchStatus,
} from '@/utils/db';
import type { LocalAudioChunk, LocalStrokeBatch } from '@/utils/constant';
import { LOCAL_BATCH_MS, UPLOAD_BATCH_MS } from '@/utils';

const _CHUNKS_PER_UPLOAD_BATCH = UPLOAD_BATCH_MS / LOCAL_BATCH_MS;
void _CHUNKS_PER_UPLOAD_BATCH;

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2;
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

async function mergeAudioBlobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) throw new Error('No blobs to merge');
  if (blobs.length === 1) return blobs[0];

  const tempCtx = new AudioContext();
  const decoded: AudioBuffer[] = [];

  for (const blob of blobs) {
    try {
      const ab = await blob.arrayBuffer();
      if (ab.byteLength < 32) continue;
      const buffer = await tempCtx.decodeAudioData(ab);
      decoded.push(buffer);
    } catch (e) {
      console.warn('[StudentUpload] sub-chunk decode failed, skipping:', e);
    }
  }

  await tempCtx.close();

  if (decoded.length === 0) return blobs[0];
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
        : new Float32Array(buf.length);
      merged.copyToChannel(src, c, sampleOff);
    }
    sampleOff += buf.length;
  }

  const targetSamples = Math.round((UPLOAD_BATCH_MS / 1000) * sampleRate);
  if (merged.length < targetSamples) {
    const padded = new AudioBuffer({ numberOfChannels: numCh, length: targetSamples, sampleRate });
    for (let c = 0; c < numCh; c++) padded.copyToChannel(merged.getChannelData(c), c, 0);
    return audioBufferToWavBlob(padded);
  }

  return audioBufferToWavBlob(merged);
}

function groupChunksByUploadBatch(chunks: LocalAudioChunk[]): Map<number, LocalAudioChunk[]> {
  const groups = new Map<number, LocalAudioChunk[]>();
  for (const chunk of chunks) {
    const batchIdx = chunk.uploadBatchIndex;
    if (!groups.has(batchIdx)) groups.set(batchIdx, []);
    groups.get(batchIdx)!.push(chunk);
  }
  for (const [, chunkList] of groups) {
    chunkList.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }
  return groups;
}

export interface StudentUploadState {
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

export interface StudentUploadResults {
  audioUrls: Array<{ chunkIndex: number; url: string; mediaId: string }>;
  strokeBatches: Array<{ batchIndex: number; indexKey: string }>;
  success: boolean;
  errors: string[];
}

interface StudentUploadOptions {
  concurrency?: number;
  onProgress?: (state: StudentUploadState) => void;
}

export function useStudentSessionUpload() {
  const [state, setState] = useState<StudentUploadState>({
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

  const updateState = useCallback((updates: Partial<StudentUploadState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const uploadMergedAudioBatch = useCallback(async (
    chunks: LocalAudioChunk[],
    sessionId: string,
    uploadBatchIdx: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; url?: string; mediaId?: string; error?: string }> => {
    const maxRetries = 3;
    let lastError = '';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (abortRef.current) return { success: false, error: 'Upload aborted' };

      try {
        const mergedBlob = await mergeAudioBlobs(chunks.map(c => c.blob));
        const result = await mediaUploadService.uploadAudio(mergedBlob, sessionId, uploadBatchIdx, onProgress);

        if (result.success && result.cdnUrl && result.mediaId) {
          for (const chunk of chunks) {
            await updateAudioChunkStatus(chunk.id, 'sent', {
              cloudinaryUrl: result.cdnUrl,
              cloudinaryPublicId: result.mediaId,
            });
          }
          return { success: true, url: result.cdnUrl, mediaId: result.mediaId };
        }
        lastError = result.error || 'Upload failed';
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
      }

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    for (const chunk of chunks) {
      await updateAudioChunkStatus(chunk.id, 'failed', { lastError });
    }
    return { success: false, error: lastError };
  }, []);

  const uploadStrokeBatchToGroupContent = useCallback(async (
    batch: LocalStrokeBatch,
    groupId: string,
    contentId: string,
  ): Promise<{ success: boolean; indexKey?: string; error?: string }> => {
    const maxRetries = 3;
    let lastError = '';
    const indexKey = `${groupId}_${contentId}_${batch.batchIndex}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (abortRef.current) return { success: false, error: 'Upload aborted' };

      try {
        const payload: GroupContentBoardBatchPayload = {
          groupId,
          contentId,
          batchIndex: batch.batchIndex,
          startMs: batch.startMs,
          endMs: batch.endMs,
          strokes: batch.strokes,
          strokeCount: batch.strokeCount,
          sizeBytes: batch.sizeBytes,
          boardIndex: batch.strokes[0]?.currentBoard ?? 0,
          boardSwitches: batch.boardSwitches,
          audioUrl: null,
        };
        await boardSessionService.submitGroupContentBatch(groupId, contentId, payload);
        await updateStrokeBatchStatus(batch.id, 'sent', { indexKey });
        return { success: true, indexKey };
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
      }

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    await updateStrokeBatchStatus(batch.id, 'failed', { lastError });
    return { success: false, error: lastError };
  }, []);

  const uploadSession = useCallback(async (
    sessionId: string,
    groupId: string,
    contentId: string,
    options: StudentUploadOptions = {}
  ): Promise<StudentUploadResults> => {
    const { concurrency = 2, onProgress } = options;
    abortRef.current = false;

    const results: StudentUploadResults = {
      audioUrls: [],
      strokeBatches: [],
      success: true,
      errors: [],
    };

    try {
      const audioChunks = await getAudioChunksBySession(sessionId);
      const strokeBatches = await getStrokeBatchesBySession(sessionId);

      const pendingAudio = audioChunks.filter(c => c.syncStatus === 'pending' || c.syncStatus === 'failed');
      const pendingStrokes = strokeBatches.filter(b => b.syncStatus === 'pending' || b.syncStatus === 'failed');

      const audioUploadGroups = groupChunksByUploadBatch(pendingAudio);
      const uploadBatchIndices = Array.from(audioUploadGroups.keys()).sort((a, b) => a - b);
      const totalItems = uploadBatchIndices.length + pendingStrokes.length;

      updateState({
        isUploading: true, phase: 'audio', totalChunks: totalItems, currentChunk: 0,
        overallProgress: 0, error: null, uploadedAudio: 0, uploadedStrokes: 0,
      });
      if (onProgress) onProgress(state);

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
            results.audioUrls.push({ chunkIndex: uploadBatchIdx, url: result.url, mediaId: result.mediaId });
            uploadedAudioBatches++;
          } else if (result.error) {
            results.errors.push(`Audio batch ${uploadBatchIdx}: ${result.error}`);
            results.success = false;
          }
        }
        updateState({ uploadedAudio: uploadedAudioBatches });
      }

      updateState({ phase: 'strokes' });
      let uploadedStrokes = 0;
      for (let i = 0; i < pendingStrokes.length; i += concurrency) {
        if (abortRef.current) break;
        const batch = pendingStrokes.slice(i, i + concurrency);
        const uploadPromises = batch.map((strokeBatch, idx) =>
          uploadStrokeBatchToGroupContent(strokeBatch, groupId, contentId).then((result) => {
            const audioOffset = pendingAudio.length;
            updateState({
              currentChunk: audioOffset + i + idx + 1,
              currentProgress: 100,
              overallProgress: Math.round(((audioOffset + i + idx + 1) / totalItems) * 100),
            });
            return result;
          })
        );
        const batchResults = await Promise.all(uploadPromises);
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const originalBatch = batch[j];
          if (result.success && result.indexKey) {
            results.strokeBatches.push({ batchIndex: originalBatch.batchIndex, indexKey: result.indexKey });
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
      updateState({ isUploading: false, phase: 'error', error });
      results.success = false;
      results.errors.push(error);
      return results;
    }
  }, [state, updateState, uploadMergedAudioBatch, uploadStrokeBatchToGroupContent]);

  const abort = useCallback(() => {
    abortRef.current = true;
    updateState({ isUploading: false, phase: 'idle', error: 'Upload cancelled' });
  }, [updateState]);

  const reset = useCallback(() => {
    abortRef.current = false;
    setState({
      isUploading: false, phase: 'idle', currentChunk: 0, totalChunks: 0,
      currentProgress: 0, overallProgress: 0, error: null, uploadedAudio: 0, uploadedStrokes: 0,
    });
  }, []);

  return { state, uploadSession, abort, reset };
}

export default useStudentSessionUpload;
