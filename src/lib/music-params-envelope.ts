import type { MoodSignalIntent } from "./signal-intent.js";
import {
  AMBIENT_PARAMS_SCHEMA_VERSION,
  type AmbientParams,
  validateMusicParams,
  type ParsedMusicInput,
} from "./music-schema.js";

/** Full payload stored on disk / returned by APIs (v2). */
export const SOUNDSCAPE_ENVELOPE_VERSION = 2 as const;

export type MusicParamsEnvelopeV1 = {
  schemaVersion: typeof AMBIENT_PARAMS_SCHEMA_VERSION;
  params: AmbientParams;
  moodSignalIntent?: MoodSignalIntent;
};

export type SoundscapeEnvelope = {
  envelopeVersion: typeof SOUNDSCAPE_ENVELOPE_VERSION;
  schemaVersion: typeof AMBIENT_PARAMS_SCHEMA_VERSION;
  sessionId: string;
  createdAt: string;
  updatedAt?: string;
  params: AmbientParams;
  moodSignalIntent?: MoodSignalIntent;
};

export function newSessionId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") {
      return c.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

function isLegacyV1Envelope(stored: unknown): stored is MusicParamsEnvelopeV1 {
  if (!stored || typeof stored !== "object") return false;
  const o = stored as Record<string, unknown>;
  if ("envelopeVersion" in o) return false;
  return (
    o.schemaVersion === AMBIENT_PARAMS_SCHEMA_VERSION &&
    "params" in o &&
    typeof o.params === "object" &&
    o.params !== null
  );
}

export function isSoundscapeEnvelope(stored: unknown): stored is SoundscapeEnvelope {
  if (!stored || typeof stored !== "object") return false;
  const o = stored as Record<string, unknown>;
  return (
    o.envelopeVersion === SOUNDSCAPE_ENVELOPE_VERSION &&
    o.schemaVersion === AMBIENT_PARAMS_SCHEMA_VERSION &&
    typeof o.sessionId === "string" &&
    o.sessionId.length > 0 &&
    typeof o.createdAt === "string" &&
    "params" in o &&
    typeof o.params === "object" &&
    o.params !== null
  );
}

/** True for legacy v1 param envelopes or v2 soundscape envelopes */
export function isMusicParamsEnvelope(stored: unknown): stored is MusicParamsEnvelopeV1 | SoundscapeEnvelope {
  return isLegacyV1Envelope(stored) || isSoundscapeEnvelope(stored);
}

/** Wrap params for JSONB storage (legacy v1 shape — prefer {@link toSoundscapeEnvelope} for new writes). */
export function toMusicParamsEnvelope(
  params: AmbientParams,
  moodIntent?: MoodSignalIntent,
): MusicParamsEnvelopeV1 {
  return {
    schemaVersion: AMBIENT_PARAMS_SCHEMA_VERSION,
    params,
    ...(moodIntent ? { moodSignalIntent: moodIntent } : {}),
  };
}

export type ToSoundscapeEnvelopeInput = {
  params: AmbientParams;
  moodSignalIntent?: MoodSignalIntent;
  sessionId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function toSoundscapeEnvelope(input: ToSoundscapeEnvelopeInput): SoundscapeEnvelope {
  const now = input.createdAt ?? new Date().toISOString();
  const updated = input.updatedAt ?? now;
  return {
    envelopeVersion: SOUNDSCAPE_ENVELOPE_VERSION,
    schemaVersion: AMBIENT_PARAMS_SCHEMA_VERSION,
    sessionId: input.sessionId ?? newSessionId(),
    createdAt: now,
    updatedAt: updated,
    params: input.params,
    ...(input.moodSignalIntent ? { moodSignalIntent: input.moodSignalIntent } : {}),
  };
}

/** Read AmbientParams from legacy flat JSON, v1 envelope, or v2 soundscape envelope */
export function unwrapMusicParams(stored: unknown): AmbientParams {
  if (!stored || typeof stored !== "object") {
    return validateMusicParams({});
  }
  const o = stored as Record<string, unknown>;
  if (isSoundscapeEnvelope(stored)) {
    return validateMusicParams(o.params as ParsedMusicInput);
  }
  if ("params" in o && o.params && typeof o.params === "object") {
    return validateMusicParams(o.params as ParsedMusicInput);
  }
  return validateMusicParams(stored as ParsedMusicInput);
}

export function unwrapMoodIntent(stored: unknown): MoodSignalIntent | undefined {
  if (!stored || typeof stored !== "object") return undefined;
  const o = stored as Record<string, unknown>;
  if ("moodSignalIntent" in o && o.moodSignalIntent && typeof o.moodSignalIntent === "object") {
    return o.moodSignalIntent as MoodSignalIntent;
  }
  return undefined;
}

export function unwrapSessionMeta(stored: unknown): { sessionId?: string; createdAt?: string } {
  if (isSoundscapeEnvelope(stored)) {
    return { sessionId: stored.sessionId, createdAt: stored.createdAt };
  }
  return {};
}
