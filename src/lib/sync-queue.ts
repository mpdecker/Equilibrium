import { apiFetch } from "./api-fetch.js";
import {
  enqueueOutboxRecord,
  type InteractionPostBody,
  type JournalPostBody,
} from "./sync-idb.js";

export function newMutationId(): string {
  const c =
    typeof globalThis !== "undefined" && typeof globalThis.crypto !== "undefined"
      ? globalThis.crypto
      : undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const buf = new Uint8Array(16);
    c.getRandomValues(buf);
    buf[6] = (buf[6]! & 0x0f) | 0x40;
    buf[8] = (buf[8]! & 0x3f) | 0x80;
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

function likelyOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

async function enqueueJournal(body: JournalPostBody): Promise<void> {
  await enqueueOutboxRecord({
    id: newMutationId(),
    kind: "journal",
    body,
    createdAt: Date.now(),
  });
}

async function enqueueInteraction(body: InteractionPostBody): Promise<void> {
  await enqueueOutboxRecord({
    id: newMutationId(),
    kind: "interaction",
    body,
    createdAt: Date.now(),
  });
}

/** POST `/api/journals` online, or enqueue for later. */
export async function postJournalOrQueue(body: JournalPostBody): Promise<{
  sent: boolean;
  queued: boolean;
}> {
  if (!likelyOnline()) {
    await enqueueJournal(body);
    return { sent: false, queued: true };
  }
  try {
    const res = await apiFetch("/api/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { sent: true, queued: false };
    if (res.status >= 400 && res.status < 500) return { sent: false, queued: false };
  } catch {
    /* enqueue */
  }
  await enqueueJournal(body);
  return { sent: false, queued: true };
}

/** POST `/api/interactions` online, or enqueue for later. */
export async function postInteractionOrQueue(body: InteractionPostBody): Promise<{
  sent: boolean;
  queued: boolean;
}> {
  if (!likelyOnline()) {
    await enqueueInteraction(body);
    return { sent: false, queued: true };
  }
  try {
    const res = await apiFetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { sent: true, queued: false };
    if (res.status >= 400 && res.status < 500) return { sent: false, queued: false };
  } catch {
    /* enqueue */
  }
  await enqueueInteraction(body);
  return { sent: false, queued: true };
}
