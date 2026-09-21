import type { IDBPDatabase } from 'idb';
import {
  STORE_CLASS, STORE_AUDIO, STORE_SESSIONS,
  STORE_AUDIO_CHUNKS, STORE_STROKE_BATCHES, STORE_REPLAY_CACHE,
  STORE_STUDENT_BOARDS, STORE_ATTENDANCE, STORE_ATTENDANCE_SESSIONS,
  STORE_OFFLINE_LEARNERS,
} from './constant';

// The BluethubClassroom IndexedDB is opened independently from several
// places (main thread, session.worker, stroke-upload.worker, sync.worker).
// IndexedDB only runs `upgrade()` once per version number — whichever of
// those connections happens to create the database first "locks in" its
// own store list for everyone else, permanently, until DB_VERSION is bumped
// again. Each call site used to carry its own copy of this logic, and they
// had drifted out of sync (some missing stores entirely, one with no
// upgrade callback at all) — causing "object store not found" errors that
// persisted even through a full IndexedDB wipe, since recreating the
// database just re-ran whichever incomplete copy touched it first. This is
// the single source of truth every call site must use instead.
export function upgradeBluethubClassroomDb(db: IDBPDatabase): void {
  if (!db.objectStoreNames.contains(STORE_CLASS)) {
    db.createObjectStore(STORE_CLASS, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORE_AUDIO)) {
    db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
    const s = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
    s.createIndex('lessonId', 'lessonId', { unique: false });
    s.createIndex('status', 'status', { unique: false });
  }
  if (!db.objectStoreNames.contains(STORE_AUDIO_CHUNKS)) {
    const s = db.createObjectStore(STORE_AUDIO_CHUNKS, { keyPath: 'id' });
    s.createIndex('sessionId', 'sessionId', { unique: false });
    s.createIndex('lessonId', 'lessonId', { unique: false });
    s.createIndex('syncStatus', 'syncStatus', { unique: false });
    s.createIndex('sessionId_chunkIndex', ['sessionId', 'chunkIndex'], { unique: true });
  }
  if (!db.objectStoreNames.contains(STORE_STROKE_BATCHES)) {
    const s = db.createObjectStore(STORE_STROKE_BATCHES, { keyPath: 'id' });
    s.createIndex('sessionId', 'sessionId', { unique: false });
    s.createIndex('lessonId', 'lessonId', { unique: false });
    s.createIndex('syncStatus', 'syncStatus', { unique: false });
    s.createIndex('sessionId_batchIndex', ['sessionId', 'batchIndex'], { unique: true });
  }
  if (!db.objectStoreNames.contains(STORE_REPLAY_CACHE)) {
    db.createObjectStore(STORE_REPLAY_CACHE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORE_STUDENT_BOARDS)) {
    db.createObjectStore(STORE_STUDENT_BOARDS, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORE_ATTENDANCE_SESSIONS)) {
    const s = db.createObjectStore(STORE_ATTENDANCE_SESSIONS, { keyPath: 'id' });
    s.createIndex('dateKey', 'dateKey', { unique: false });
    s.createIndex('scopeKey', 'scopeKey', { unique: false });
    s.createIndex('status', 'status', { unique: false });
  }
  if (!db.objectStoreNames.contains(STORE_ATTENDANCE)) {
    const s = db.createObjectStore(STORE_ATTENDANCE, { keyPath: 'id' });
    s.createIndex('sessionId', 'sessionId', { unique: false });
    s.createIndex('syncStatus', 'syncStatus', { unique: false });
    s.createIndex('dedupeKey', 'dedupeKey', { unique: true });
    s.createIndex('dateKey', 'dateKey', { unique: false });
  }
  if (!db.objectStoreNames.contains(STORE_OFFLINE_LEARNERS)) {
    const s = db.createObjectStore(STORE_OFFLINE_LEARNERS, { keyPath: 'id' });
    s.createIndex('username', 'username', { unique: true });
    s.createIndex('hashPassword', 'hashPassword', { unique: true });
  }
}
