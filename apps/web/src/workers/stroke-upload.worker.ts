/// <reference lib="webworker" />

import { openDB } from 'idb';
import {
  DB_NAME, DB_VERSION, STORE_STROKE_BATCHES,
  type LocalStrokeBatch,
} from '@/utils/constant';

type StrokePayload = {
  id: string;
  data: string;
  color: string;
  width: number;
  startTime: string;
  endTime: string;
  currentBoard: number;
  strokeType: string;
  timestamp: string;
  type: string;
  duration?: number;
  metadata?: Record<string, unknown>;
};

type StrokeBatchMessage = {
  localId: string;
  sessionId: string;
  lessonId: string;
  batchIndex: number;
  startMs: number;
  endMs: number;
  strokeCount: number;
  sizeBytes: number;
  boardIndex: number;
  strokes: StrokePayload[];
  boardSwitches?: Array<{ fromBoard: number; toBoard: number; timestampMs: number }>;
  // Set only for student study-group recordings — routes this batch to its
  // own queue/worker/collection instead of the teacher's live-session endpoint.
  groupId?: string;
};

type ToWorkerMessage =
  | {
      type: "START";
      apiBaseUrl: string;
      authToken: string;
      tenantId: string;
      batches: StrokeBatchMessage[];
    }
  | {
      type: "START_UPLOAD";
      sessionId: string;
      apiBaseUrl: string;
      authToken: string;
      tenantId: string;
      groupId?: string;
    };

type FromWorkerMessage =
  | { type: "BATCH_SENT"; localId: string; batchIndex: number; id: string; indexKey: string }
  | { type: "BATCH_FAILED"; localId: string; batchIndex: number; error: string }
  | { type: "COMPLETE" }
  | { type: "ERROR"; error: string };

const MAX_RETRIES = 3;

async function submitBatch(
  apiBaseUrl: string,
  authToken: string,
  tenantId: string,
  batch: StrokeBatchMessage
): Promise<void> {
  const base = apiBaseUrl.replace(/\/$/, "");
  const isGroupContent = !!batch.groupId;
  const url = isGroupContent
    ? `${base}/api/board/group-content/group/${batch.groupId}/batch`
    : `${base}/api/board/session/${batch.sessionId}/batch`;

  const requestBody = isGroupContent
    ? {
        groupId: batch.groupId,
        batchIndex: batch.batchIndex,
        startMs: batch.startMs,
        endMs: batch.endMs,
        strokes: batch.strokes,
        strokeCount: batch.strokeCount,
        sizeBytes: batch.sizeBytes,
        boardIndex: batch.boardIndex,
        boardSwitches: batch.boardSwitches ?? [],
        audioUrl: null,
      }
    : {
        sessionId: batch.sessionId,
        lessonId: batch.lessonId,
        batchIndex: batch.batchIndex,
        startMs: batch.startMs,
        endMs: batch.endMs,
        strokes: batch.strokes,
        strokeCount: batch.strokeCount,
        boardIndex: batch.boardIndex,
        boardSwitches: batch.boardSwitches ?? [],
      };

  console.log('[stroke-upload-worker] 📤 Submitting stroke batch:', {
    url,
    batchIndex: batch.batchIndex,
    sessionId: batch.sessionId,
    lessonId: batch.lessonId,
    strokeCount: batch.strokeCount,
    hasAuth: !!authToken,
    authTokenPrefix: authToken ? authToken.slice(0, 20) + '...' : 'MISSING',
    tenantId: tenantId || 'MISSING',
    bodyStrokesSample: batch.strokes.slice(0, 2).map(s => ({ id: s.id, type: s.type, board: s.currentBoard })),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
      "X-Tenant-ID": tenantId,
    },
    body: JSON.stringify(requestBody),
  });

  console.log('[stroke-upload-worker] 📥 Response received:', {
    status: response.status,
    statusText: response.statusText,
    batchIndex: batch.batchIndex,
    ok: response.ok,
  });

  if (response.status !== 204 && response.status !== 200) {
    const text = await response.text();
    console.error('[stroke-upload-worker] ❌ Upload failed — server response body:', text);
    throw new Error(`Stroke batch upload failed: ${response.status} ${text}`);
  }

  console.log('[stroke-upload-worker] ✅ Batch', batch.batchIndex, 'uploaded successfully');
}

self.onmessage = async (event: MessageEvent<ToWorkerMessage>) => {
  const msg = event.data;

  console.log('[stroke-upload-worker] Message received:', msg.type);

  if (msg.type === "START_UPLOAD") {
    // New flow: Load batches from IDB for a completed session
    console.log('[stroke-upload-worker] START_UPLOAD for sessionId:', (msg as any).sessionId);

    if (!(msg as any).apiBaseUrl) {
      console.error('[stroke-upload-worker] ❌ apiBaseUrl is missing');
      self.postMessage({ type: 'ERROR', error: 'apiBaseUrl is missing' } as FromWorkerMessage);
      return;
    }

    try {
      // Open IDB and load pending stroke batches
      const db = await openDB(DB_NAME, DB_VERSION);
      const allBatches = await db.getAll(STORE_STROKE_BATCHES);
      
      // Filter for the session and convert to upload format
      const sessionBatches = allBatches
        .filter((b: LocalStrokeBatch) => b.sessionId === (msg as any).sessionId && b.syncStatus === 'pending')
        .sort((a: LocalStrokeBatch, b: LocalStrokeBatch) => a.batchIndex - b.batchIndex);

      console.log('[stroke-upload-worker] Loaded', sessionBatches.length, 'pending batches from IDB for sessionId:', (msg as any).sessionId);

      if (sessionBatches.length === 0) {
        console.log('[stroke-upload-worker] No pending batches to upload');
        self.postMessage({ type: 'COMPLETE' } as FromWorkerMessage);
        return;
      }

      // Convert LocalStrokeBatch to StrokeBatchMessage format
      const groupId = (msg as any).groupId as string | undefined;
      const batches: StrokeBatchMessage[] = sessionBatches.map((batch: LocalStrokeBatch) => ({
        localId: batch.id,
        sessionId: batch.sessionId,
        lessonId: batch.lessonId,
        batchIndex: batch.batchIndex,
        startMs: batch.startMs,
        endMs: batch.endMs,
        strokeCount: batch.strokeCount,
        sizeBytes: batch.sizeBytes,
        boardIndex: 0, // Default to first board
        strokes: batch.strokes as unknown as StrokePayload[],
        boardSwitches: batch.boardSwitches,
        groupId,
      }));

      console.log('[stroke-upload-worker] ✅ Converted batches for upload:', {
        count: batches.length,
        sample: batches.slice(0, 2).map(b => ({ index: b.batchIndex, strokes: b.strokeCount })),
      });

      // Now process like START message
      await processUpload((msg as any).apiBaseUrl, (msg as any).authToken, (msg as any).tenantId, batches);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[stroke-upload-worker] ❌ Failed to load batches from IDB:', errorMsg);
      self.postMessage({ type: 'ERROR', error: errorMsg } as FromWorkerMessage);
    }
    return;
  }

  if (msg.type !== "START") {
    console.log('[stroke-upload-worker] Received non-START message:', (msg as unknown as { type: string }).type);
    return;
  }

  // Original START message flow
  const startMsg = msg as Extract<ToWorkerMessage, { type: "START" }>;
  await processUpload(startMsg.apiBaseUrl, startMsg.authToken, startMsg.tenantId, startMsg.batches);
};

async function processUpload(
  apiBaseUrl: string,
  authToken: string,
  tenantId: string,
  batches: StrokeBatchMessage[]
): Promise<void> {
  console.log('[stroke-upload-worker] Processing upload:', {
    apiBaseUrl,
    hasAuthToken: !!authToken,
    tenantId,
    batchCount: batches?.length ?? 0,
    batches: batches?.map(b => ({
      localId: b.localId,
      batchIndex: b.batchIndex,
      sessionId: b.sessionId,
      strokeCount: b.strokeCount,
    })),
  });

  // ── Critical pre-flight checks ─────────────────────────────────────────────
  if (!apiBaseUrl) {
    console.error('[stroke-upload-worker] ❌ ABORT: apiBaseUrl is missing — cannot upload any batches');
    self.postMessage({ type: 'ERROR', error: 'apiBaseUrl is missing' } as FromWorkerMessage);
    return;
  }
  if (!authToken) {
    console.error('[stroke-upload-worker] ❌ WARNING: authToken is missing — all API requests will return 401 Unauthorized');
  }
  if (!tenantId) {
    console.error('[stroke-upload-worker] ❌ WARNING: tenantId is missing — X-Tenant-ID header will be empty, requests may be rejected');
  }
  if (!batches || batches.length === 0) {
    console.warn(
      '[stroke-upload-worker] ⚠️ batches array is EMPTY — nothing to upload.',
      'Root cause: session.worker may not have flushed STROKE_BATCHES to IDB,',
      'OR class.tsx never called sendStroke() so session.worker never received RAW_STROKE messages.'
    );
    self.postMessage({ type: 'COMPLETE' } as FromWorkerMessage);
    return;
  }
  console.log('[stroke-upload-worker] ✅ Pre-flight OK — starting upload of', batches.length, 'batch(es)');

  try {
    for (const batch of batches) {
      let uploaded = false;
      let lastError = "Unknown error";

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(`[stroke-upload-worker] Attempting batch ${batch.batchIndex}, attempt ${attempt + 1}/${MAX_RETRIES}`);
          await submitBatch(apiBaseUrl, authToken, tenantId, batch);
          const indexKey = `${batch.sessionId}_${batch.batchIndex}`;
          const done: FromWorkerMessage = {
            type: "BATCH_SENT",
            localId: batch.localId,
            batchIndex: batch.batchIndex,
            id: indexKey,
            indexKey,
          };
          console.log('[stroke-upload-worker] Posting BATCH_SENT message:', done);
          self.postMessage(done);
          uploaded = true;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Unknown error";
          console.log(`[stroke-upload-worker] Batch ${batch.batchIndex} attempt ${attempt + 1} failed:`, lastError);
          if (attempt < MAX_RETRIES - 1) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      if (!uploaded) {
        const failed: FromWorkerMessage = {
          type: "BATCH_FAILED",
          localId: batch.localId,
          batchIndex: batch.batchIndex,
          error: lastError,
        };
        console.log('[stroke-upload-worker] Posting BATCH_FAILED message:', failed);
        self.postMessage(failed);
      }
    }

    const complete: FromWorkerMessage = { type: "COMPLETE" };
    console.log('[stroke-upload-worker] All batches processed, posting COMPLETE');
    self.postMessage(complete);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Worker failed";
    console.error('[stroke-upload-worker] Caught error in main handler:', errorMsg);
    const failed: FromWorkerMessage = {
      type: "ERROR",
      error: errorMsg,
    };
    self.postMessage(failed);
  }
}
