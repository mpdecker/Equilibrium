import type { SoundscapeEnvelope } from "./music-params-envelope.js";
import { isSoundscapeEnvelope } from "./music-params-envelope.js";

const DB_NAME = "equilibrium";
const DB_VERSION = 1;
const STORE = "soundscapeMirror";
/** Single-row mirror of localStorage snapshot */
const RECORD_KEY = "equilibrium.soundscape.v2";

function idbAvailable(): boolean {
  return typeof globalThis.indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function writeSoundscapeMirror(envelope: SoundscapeEnvelope): Promise<void> {
  if (!idbAvailable()) return;
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(envelope, RECORD_KEY);
    });
  } catch {
    /* quota, private mode, Safari quirks */
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

export async function readSoundscapeMirror(): Promise<SoundscapeEnvelope | null> {
  if (!idbAvailable()) return null;
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db!.transaction(STORE, "readonly");
      tx.onerror = () => reject(tx.error);
      const req = tx.objectStore(STORE).get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return isSoundscapeEnvelope(raw) ? raw : null;
  } catch {
    return null;
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}
