import { apiFetch } from "./api-fetch.js";
import type { SoundscapeEnvelope } from "./music-params-envelope.js";

export type UpsertBackendSessionInput = {
  sessionId: string;
  soundscapeEnvelope?: SoundscapeEnvelope | unknown;
  userId?: string | null;
  label?: string;
};

/**
 * Upsert server-side session row (soundscape envelope sync). No-op when offline.
 */
export async function upsertBackendSession(input: UpsertBackendSessionInput): Promise<void> {
  const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
  if (!online || !input.sessionId || input.sessionId.length < 8) return;

  try {
    const res = await apiFetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: input.sessionId,
        ...(input.soundscapeEnvelope !== undefined ? { soundscapeEnvelope: input.soundscapeEnvelope } : {}),
        ...(input.userId !== undefined ? { userId: input.userId } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
      }),
    });
    if (!res.ok) {
      console.warn("upsertBackendSession failed:", res.status);
    }
  } catch (e) {
    console.warn("upsertBackendSession error:", e);
  }
}
