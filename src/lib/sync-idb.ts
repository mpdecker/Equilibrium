import { apiFetch } from "./api-fetch.js";

const DB_NAME = "equilibriumSync";
const DB_VERSION = 1;
const OUTBOX = "outbox";
const META = "meta";
const META_JOURNAL_KEY = "journalListCache";

export type OutboxKind = "journal" | "interaction";

export type JournalPostBody = {
  content: string;
  sessionId?: string;
  moodText?: string;
  clientMutationId: string;
};

export type InteractionPostBody = {
  musicParams: unknown;
  userResponse: string;
  moodSignalIntent?: unknown;
  sessionId?: string;
  moodText?: string;
  schemaVersion?: number;
  clientEngine?: string | null;
  clientMutationId: string;
};

export interface OutboxRecord {
  id: string;
  kind: OutboxKind;
  body: JournalPostBody | InteractionPostBody;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

/** Minimal journal row for offline display (server or pending local). */
export type CachedJournalRow = {
  id: number | string;
  content: string;
  sessionId?: string | null;
  moodText?: string | null;
  createdAt: string;
  pendingSync?: boolean;
};

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
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
  });
}

export async function enqueueOutboxRecord(rec: Omit<OutboxRecord, "attempts" | "lastError">): Promise<void> {
  if (!idbAvailable()) return;
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    const full: OutboxRecord = { ...rec, attempts: 0 };
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(OUTBOX, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(OUTBOX).put(full);
    });
  } catch {
    /* quota */
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

export async function getOutboxCount(): Promise<number> {
  if (!idbAvailable()) return 0;
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    return await new Promise<number>((resolve, reject) => {
      const tx = db!.transaction(OUTBOX, "readonly");
      tx.onerror = () => reject(tx.error);
      const req = tx.objectStore(OUTBOX).count();
      req.onsuccess = () => resolve(Number(req.result));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

export async function listOutboxOldestFirst(): Promise<OutboxRecord[]> {
  if (!idbAvailable()) return [];
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    const rows = await new Promise<OutboxRecord[]>((resolve, reject) => {
      const tx = db!.transaction(OUTBOX, "readonly");
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(OUTBOX);
      const req = store.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const all = Array.isArray(req.result) ? (req.result as OutboxRecord[]) : [];
        all.sort((a, b) => a.createdAt - b.createdAt);
        resolve(all);
      };
    });
    return rows;
  } catch {
    return [];
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

async function deleteOutboxId(id: string): Promise<void> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(OUTBOX, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(OUTBOX).delete(id);
    });
  } catch {
    /* ignore */
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

async function bumpOutboxFailure(id: string, errMsg: string, attempts: number): Promise<void> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(OUTBOX, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(OUTBOX);
      const req = store.get(id);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const row = req.result as OutboxRecord | undefined;
        if (!row) {
          resolve();
          return;
        }
        row.attempts = attempts + 1;
        row.lastError = errMsg.slice(0, 500);
        store.put(row);
      };
    });
  } catch {
    /* ignore */
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

export async function writeJournalListCache(entries: CachedJournalRow[]): Promise<void> {
  if (!idbAvailable()) return;
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(META, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(META).put({ updatedAt: Date.now(), entries }, META_JOURNAL_KEY);
    });
  } catch {
    /* ignore */
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

export async function readJournalListCache(): Promise<CachedJournalRow[]> {
  if (!idbAvailable()) return [];
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    const raw = await new Promise<{ entries?: CachedJournalRow[] } | undefined>((resolve, reject) => {
      const tx = db!.transaction(META, "readonly");
      tx.onerror = () => reject(tx.error);
      const req = tx.objectStore(META).get(META_JOURNAL_KEY);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result as { entries?: CachedJournalRow[] });
    });
    const e = raw?.entries;
    return Array.isArray(e) ? e : [];
  } catch {
    return [];
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

/** POST one outbox item; deletes on 2xx; drops on most 4xx; requeues on network/5xx */
export async function sendOutboxItem(row: OutboxRecord): Promise<"removed" | "retry" | "drop"> {
  try {
    const path = row.kind === "journal" ? "/api/journals" : "/api/interactions";
    const res = await apiFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row.body),
    });
    if (res.ok) {
      await deleteOutboxId(row.id);
      return "removed";
    }
    const errText = await res.text().catch(() => "");
    if (res.status >= 400 && res.status < 500) {
      await deleteOutboxId(row.id);
      return "drop";
    }
    await bumpOutboxFailure(row.id, errText || `HTTP ${res.status}`, row.attempts);
    return "retry";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await bumpOutboxFailure(row.id, msg, row.attempts);
    return "retry";
  }
}

/** Flush queued mutations in order until empty or exhausted steps. Returns count removed. */
export async function flushOutbox(maxSteps = 40): Promise<{ removed: number; remaining: number }> {
  let removed = 0;
  for (let step = 0; step < maxSteps; step++) {
    const q = await listOutboxOldestFirst();
    if (q.length === 0) return { removed, remaining: 0 };
    const head = q[0]!;
    const result = await sendOutboxItem(head);
    if (result === "removed") removed += 1;
    else if (result === "retry") break;
    else removed += 1;
  }
  const remaining = (await listOutboxOldestFirst()).length;
  return { removed, remaining };
}

export function pendingJournalEntriesFromOutbox(rows: OutboxRecord[]): CachedJournalRow[] {
  return rows
    .filter((r): r is OutboxRecord & { kind: "journal" } => r.kind === "journal")
    .map((r) => ({
      id: `pending:${r.body.clientMutationId}`,
      content: (r.body as JournalPostBody).content,
      sessionId: (r.body as JournalPostBody).sessionId ?? null,
      moodText: (r.body as JournalPostBody).moodText ?? null,
      createdAt: new Date(r.createdAt).toISOString(),
      pendingSync: true,
    }));
}
