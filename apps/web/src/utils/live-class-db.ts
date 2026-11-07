/**
 * A separate IndexedDB database, dedicated to Live Class recording.
 *
 * Deliberately NOT the existing `BluethubClassroom` database (`utils/db.ts`)
 * that the production solo-lesson recorder depends on — a distinct name and
 * its own version counter means nothing here can ever trigger that
 * database's upgrade path, collide with its stores, or be affected by a
 * schema change made for the other feature (and vice versa).
 *
 * Gives `useLiveClassRecorder` local durability: a stroke batch or audio
 * chunk is written here as "pending" before it's ever sent over the network,
 * and flipped to "sent" only once the upload actually succeeds — so a failed
 * or interrupted upload can be retried from local data instead of being
 * silently lost.
 */

import { openDB, type IDBPDatabase } from "idb";
import type { BoardBatchPayload } from "@/services/board-session";

const DB_NAME = "BluethubLiveClass";
const DB_VERSION = 1;
const STORE_STROKE_BATCHES = "liveStrokeBatches";
const STORE_AUDIO_CHUNKS = "liveAudioChunks";

export interface LiveStrokeBatchRecord {
  id: string; // `${sessionId}_${batchIndex}`
  sessionId: string;
  batchIndex: number;
  payload: BoardBatchPayload;
  status: "pending" | "sent";
  createdAt: number;
}

export interface LiveAudioChunkRecord {
  id: string; // `${sessionId}_${chunkIndex}`
  sessionId: string;
  chunkIndex: number;
  startMs: number;
  endMs: number;
  blob: Blob;
  status: "pending" | "sent";
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_STROKE_BATCHES)) {
          const store = db.createObjectStore(STORE_STROKE_BATCHES, { keyPath: "id" });
          store.createIndex("sessionId", "sessionId");
        }
        if (!db.objectStoreNames.contains(STORE_AUDIO_CHUNKS)) {
          const store = db.createObjectStore(STORE_AUDIO_CHUNKS, { keyPath: "id" });
          store.createIndex("sessionId", "sessionId");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveStrokeBatch(record: LiveStrokeBatchRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE_STROKE_BATCHES, record);
}

export async function markStrokeBatchSent(id: string): Promise<void> {
  const db = await getDb();
  const record = await db.get(STORE_STROKE_BATCHES, id);
  if (record) await db.put(STORE_STROKE_BATCHES, { ...record, status: "sent" });
}

export async function getPendingStrokeBatches(sessionId: string): Promise<LiveStrokeBatchRecord[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(STORE_STROKE_BATCHES, "sessionId", sessionId);
  return all.filter((r) => r.status === "pending");
}

export async function saveAudioChunk(record: LiveAudioChunkRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE_AUDIO_CHUNKS, record);
}

export async function markAudioChunkSent(id: string): Promise<void> {
  const db = await getDb();
  const record = await db.get(STORE_AUDIO_CHUNKS, id);
  if (record) await db.put(STORE_AUDIO_CHUNKS, { ...record, status: "sent" });
}

export async function getPendingAudioChunks(sessionId: string): Promise<LiveAudioChunkRecord[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(STORE_AUDIO_CHUNKS, "sessionId", sessionId);
  return all.filter((r) => r.status === "pending");
}

/** Called once the manifest for this session has been submitted — clears
 * both stores for it so this database doesn't grow unbounded across classes. */
export async function clearLiveClassSession(sessionId: string): Promise<void> {
  const db = await getDb();
  const batchKeys = await db.getAllKeysFromIndex(STORE_STROKE_BATCHES, "sessionId", sessionId);
  const chunkKeys = await db.getAllKeysFromIndex(STORE_AUDIO_CHUNKS, "sessionId", sessionId);
  await Promise.all([
    ...batchKeys.map((k) => db.delete(STORE_STROKE_BATCHES, k)),
    ...chunkKeys.map((k) => db.delete(STORE_AUDIO_CHUNKS, k)),
  ]);
}
