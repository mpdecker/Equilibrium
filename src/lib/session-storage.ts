import type { SoundscapeEnvelope } from "./music-params-envelope.js";
import { isSoundscapeEnvelope } from "./music-params-envelope.js";
import { readSoundscapeMirror, writeSoundscapeMirror } from "./session-storage-idb.js";

const STORAGE_KEY = "equilibrium.soundscape.v2";

/** Wall-clock sort key for choosing between duplicate mirrors (localStorage vs IndexedDB). */
export function soundscapeTimestampMs(e: SoundscapeEnvelope): number {
  const raw = e.updatedAt ?? e.createdAt;
  const n = Date.parse(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Prefer the envelope with the newer wall-clock stamp (ties → second arg). Exported for tests. */
export function pickNewerSoundscape(
  a: SoundscapeEnvelope | null,
  b: SoundscapeEnvelope | null,
): SoundscapeEnvelope | null {
  if (!a) return b;
  if (!b) return a;
  const tb = soundscapeTimestampMs(b);
  const ta = soundscapeTimestampMs(a);
  return tb >= ta ? b : a;
}

export function persistSoundscapeEnvelope(env: SoundscapeEnvelope): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
  } catch {
    /* private mode / quota */
  }
  void writeSoundscapeMirror(env).catch(() => {});
}

export function loadSoundscapeEnvelope(): SoundscapeEnvelope | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSoundscapeEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Merge localStorage + IndexedDB mirrors and return the newest valid envelope.
 * Use after sync {@link loadSoundscapeEnvelope} for hydration when IDB may hold a fresher write.
 */
export async function loadSoundscapeEnvelopeMerged(): Promise<SoundscapeEnvelope | null> {
  const fromLs = loadSoundscapeEnvelope();
  const fromIdb = await readSoundscapeMirror();
  return pickNewerSoundscape(fromLs, fromIdb);
}
