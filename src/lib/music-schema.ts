import { z } from "zod";

/** Bump when persisted params shape changes */
export const AMBIENT_PARAMS_SCHEMA_VERSION = 1 as const;

export interface AmbientParams {
  baseFrequency: number;
  chordIntervals: number[];
  filterCutoffMax: number;
  lfoSpeed: number;
  reverbWet: number;
  reverbDecay: number;
  volume: number;
  droneVolume: number;
  padVolume: number;
  arpVolume: number;
  bellVolume: number;
  subVolume: number;
  colorPalette: string[];
  oscillatorType: "sine" | "triangle" | "square" | "sawtooth";
  harmonicity: number;
  modulationIndex: number;
  noiseAmount: number;
  noiseType: "white" | "pink" | "brown";
  delayTime: "8n" | "4n" | "2n";
  delayFeedback: number;
  complexity: number;
  attackTime: number;
  releaseTime: number;
  chorusDepth: number;
  phaserFrequency: number;
}

/** Client synthesis preference; `auto` follows `/api/audio-rollout` effectiveEngine (`wasm` when server rolls worklet path). */
export type SynthesisEnginePreference = "tone" | "preview" | "wasm" | "auto";

export interface EvolutionSettings {
  timbreDiversity: number;
  evolutionSpeed: number;
  feedbackSubtlety: number;
  particleDensity: number;
  synthesisEngine: SynthesisEnginePreference;
}

export const defaultSettings: EvolutionSettings = {
  timbreDiversity: 0.5,
  evolutionSpeed: 0.5,
  feedbackSubtlety: 0.8,
  particleDensity: 150,
  synthesisEngine: "tone",
};

export const defaultParams: AmbientParams = {
  baseFrequency: 110,
  chordIntervals: [0, 7, 12, 16],
  filterCutoffMax: 800,
  lfoSpeed: 0.1,
  reverbWet: 0.8,
  reverbDecay: 5.0,
  volume: 0,
  droneVolume: -5,
  padVolume: -5,
  arpVolume: -5,
  bellVolume: -5,
  subVolume: -5,
  colorPalette: ["#1e1b4b", "#4c1d95", "#0ea5e9"],
  oscillatorType: "sine",
  harmonicity: 2.0,
  modulationIndex: 2.0,
  noiseAmount: 0.1,
  noiseType: "pink",
  delayTime: "4n",
  delayFeedback: 0.4,
  complexity: 0.3,
  attackTime: 4.0,
  releaseTime: 8.0,
  chorusDepth: 0.5,
  phaserFrequency: 0.5,
};

const VALID_OSCILLATOR_TYPES = ["sine", "triangle", "square", "sawtooth"] as const;
const VALID_NOISE_TYPES = ["white", "pink", "brown"] as const;
const VALID_DELAY_TIMES = ["8n", "4n", "2n"] as const;
const DEFAULT_COLOR_PALETTE = ["#2d3748", "#1a202c", "#000000"] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function toSafeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isValidColor(hex: unknown): boolean {
  return typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex);
}

/** Loose LLM / JSON payload before clamping */
export interface ParsedMusicInput {
  baseFrequency?: unknown;
  chordIntervals?: unknown;
  filterCutoffMax?: unknown;
  lfoSpeed?: unknown;
  reverbWet?: unknown;
  reverbDecay?: unknown;
  volume?: unknown;
  droneVolume?: unknown;
  padVolume?: unknown;
  arpVolume?: unknown;
  bellVolume?: unknown;
  subVolume?: unknown;
  colorPalette?: unknown;
  oscillatorType?: unknown;
  harmonicity?: unknown;
  modulationIndex?: unknown;
  noiseAmount?: unknown;
  noiseType?: unknown;
  delayTime?: unknown;
  delayFeedback?: unknown;
  complexity?: unknown;
  attackTime?: unknown;
  releaseTime?: unknown;
  chorusDepth?: unknown;
  phaserFrequency?: unknown;
  feedbackPrompt?: unknown;
  moodSignalIntent?: unknown;
}

export function validateMusicParams(parsed: ParsedMusicInput): AmbientParams {
  const colorPalette: string[] =
    Array.isArray(parsed.colorPalette) &&
    parsed.colorPalette.length === 3 &&
    parsed.colorPalette.every(isValidColor)
      ? parsed.colorPalette
      : [...DEFAULT_COLOR_PALETTE];

  const chordIntervals: number[] = Array.isArray(parsed.chordIntervals)
    ? parsed.chordIntervals.filter((v): v is number => typeof v === "number").slice(0, 6)
    : [0, 7, 12, 16];

  if (chordIntervals.length === 0) {
    chordIntervals.push(0, 7, 12, 16);
  }

  return {
    baseFrequency: clamp(toSafeNumber(parsed.baseFrequency, 100), 40, 440),
    chordIntervals,
    filterCutoffMax: clamp(toSafeNumber(parsed.filterCutoffMax, 1500), 200, 5000),
    lfoSpeed: clamp(toSafeNumber(parsed.lfoSpeed, 0.05), 0.01, 1),
    reverbWet: clamp(toSafeNumber(parsed.reverbWet, 0.8), 0, 1),
    reverbDecay: clamp(toSafeNumber(parsed.reverbDecay, 5.0), 1, 20),
    volume: clamp(toSafeNumber(parsed.volume, -10), -40, 0),
    droneVolume: clamp(toSafeNumber(parsed.droneVolume, -15), -60, 0),
    padVolume: clamp(toSafeNumber(parsed.padVolume, -15), -60, 0),
    arpVolume: clamp(toSafeNumber(parsed.arpVolume, -10), -60, 0),
    bellVolume: clamp(toSafeNumber(parsed.bellVolume, -8), -60, 0),
    subVolume: clamp(toSafeNumber(parsed.subVolume, -12), -60, 0),
    colorPalette,
    oscillatorType: (VALID_OSCILLATOR_TYPES as readonly string[]).includes(toSafeString(parsed.oscillatorType))
      ? (parsed.oscillatorType as AmbientParams["oscillatorType"])
      : "sine",
    harmonicity: clamp(toSafeNumber(parsed.harmonicity, 2.0), 0.1, 5.0),
    modulationIndex: clamp(toSafeNumber(parsed.modulationIndex, 2.0), 0, 10.0),
    noiseAmount: clamp(toSafeNumber(parsed.noiseAmount, 0.1), 0, 1.0),
    noiseType: (VALID_NOISE_TYPES as readonly string[]).includes(toSafeString(parsed.noiseType))
      ? (parsed.noiseType as AmbientParams["noiseType"])
      : "pink",
    delayTime: (VALID_DELAY_TIMES as readonly string[]).includes(toSafeString(parsed.delayTime))
      ? (parsed.delayTime as AmbientParams["delayTime"])
      : "4n",
    delayFeedback: clamp(toSafeNumber(parsed.delayFeedback, 0.4), 0, 0.9),
    complexity: clamp(toSafeNumber(parsed.complexity, 0.5), 0, 1),
    attackTime: clamp(toSafeNumber(parsed.attackTime, 4.0), 0.1, 10.0),
    releaseTime: clamp(toSafeNumber(parsed.releaseTime, 8.0), 0.1, 20.0),
    chorusDepth: clamp(toSafeNumber(parsed.chorusDepth, 0.5), 0, 1.0),
    phaserFrequency: clamp(toSafeNumber(parsed.phaserFrequency, 0.5), 0.1, 10.0),
  };
}

export function validateFeedbackPrompt(parsed: { feedbackPrompt?: unknown }): {
  question: string;
  options: string[];
} {
  const fp = parsed.feedbackPrompt;
  if (fp && typeof fp === "object" && !Array.isArray(fp)) {
    const obj = fp as Record<string, unknown>;
    const question =
      typeof obj.question === "string" && obj.question.trim()
        ? obj.question
        : "How is this space feeling?";
    const options =
      Array.isArray(obj.options) && obj.options.length === 3 && obj.options.every((o) => typeof o === "string")
        ? (obj.options as string[])
        : ["Centering", "A bit intense", "Need more uplift"];
    return { question, options };
  }
  return {
    question: "How is this space feeling?",
    options: ["Centering", "A bit intense", "Need more uplift"],
  };
}

export const evolutionSettingsSchema = z.object({
  timbreDiversity: z.number().min(0).max(1).optional(),
  evolutionSpeed: z.number().min(0).max(1).optional(),
  feedbackSubtlety: z.number().min(0).max(1).optional(),
  particleDensity: z.number().min(50).max(300).optional(),
  synthesisEngine: z.enum(["tone", "preview", "wasm", "auto"]).optional(),
});

/** Partial current params from client — validated as unknown record then merged with defaults */
export const generateMusicRequestSchema = z.object({
  mood: z.string().min(1).max(8000),
  currentParams: z.record(z.string(), z.unknown()).optional(),
  settings: evolutionSettingsSchema.optional(),
  /** Continue an existing soundscape session id when regenerating */
  sessionId: z.string().min(8).max(128).optional(),
});

export type GenerateMusicRequest = z.infer<typeof generateMusicRequestSchema>;

export function normalizeEvolutionSettings(input?: z.infer<typeof evolutionSettingsSchema>): EvolutionSettings {
  const merged = { ...defaultSettings, ...input };
  const se = merged.synthesisEngine;
  const synthesisEngine: SynthesisEnginePreference =
    se === "preview" || se === "auto" || se === "wasm" ? se : "tone";
  return {
    timbreDiversity: clamp(merged.timbreDiversity, 0, 1),
    evolutionSpeed: clamp(merged.evolutionSpeed, 0, 1),
    feedbackSubtlety: clamp(merged.feedbackSubtlety, 0, 1),
    particleDensity: clamp(merged.particleDensity, 50, 300),
    synthesisEngine,
  };
}

/** Merge partial client params with defaults then clamp via validateMusicParams */
export function ambientParamsFromClientPayload(raw: Record<string, unknown> | undefined): AmbientParams {
  if (!raw || typeof raw !== "object") return { ...defaultParams };
  return validateMusicParams({ ...defaultParams, ...raw } as ParsedMusicInput);
}

export const interactionPostSchema = z.object({
  musicParams: z.unknown(),
  userResponse: z.string().min(1).max(4000),
  moodSignalIntent: z.unknown().optional(),
  schemaVersion: z.number().int().positive().optional(),
  sessionId: z.string().min(8).max(128).optional(),
  moodText: z.string().max(4000).optional(),
  clientEngine: z.string().max(32).optional(),
  /** Stable idempotent key for retries / offline flush */
  clientMutationId: z
    .string()
    .min(16)
    .max(128)
    .regex(/^[a-zA-Z0-9-]+$/)
    .optional(),
});

export const journalPostSchema = z.object({
  content: z.string().trim().min(1).max(16000),
  sessionId: z.string().min(8).max(128).optional(),
  moodText: z.string().max(4000).optional(),
  /** Stable idempotent key for retries / offline flush */
  clientMutationId: z
    .string()
    .min(16)
    .max(128)
    .regex(/^[a-zA-Z0-9-]+$/)
    .optional(),
});

/** Client-owned soundscape session id (UUID or sess_* fallback); shared across APIs */
export const sessionIdStringSchema = z.string().min(8).max(128);

/** Query string: optional filter for journal/interaction lists */
export const optionalSessionIdQuerySchema = z.object({
  sessionId: sessionIdStringSchema.optional(),
});

/** GET /api/preferences */
export const preferencesQuerySchema = z.object({
  sessionId: sessionIdStringSchema,
});

/** POST /api/sessions — upsert auth-ready anonymous session row */
export const sessionUpsertSchema = z.object({
  sessionId: sessionIdStringSchema,
  /** Reserved for future auth; ignored unless explicitly sent */
  userId: z.string().min(1).max(128).optional().nullable(),
  label: z.string().max(256).optional(),
  /** Full {@link import("./music-params-envelope.js").SoundscapeEnvelope} JSON when syncing client state */
  soundscapeEnvelope: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SessionUpsertBody = z.infer<typeof sessionUpsertSchema>;

/**
 * Parse `sessionId` from Express `req.query`; returns undefined if absent or invalid (caller may fall back to unscoped).
 */
export function parseOptionalSessionIdFromQuery(query: unknown): string | undefined {
  if (!query || typeof query !== "object") return undefined;
  const raw = (query as Record<string, unknown>).sessionId;
  if (typeof raw !== "string" || raw === "") return undefined;
  const parsed = sessionIdStringSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/** Prefer JSON body session id; fall back to trimmed `X-Session-Id` header for rate-limit / generation parity */
export function mergeGenerateMusicSessionId(
  bodySessionId: string | undefined,
  headerSessionId: string | undefined,
): string | undefined {
  if (bodySessionId) return bodySessionId;
  if (typeof headerSessionId !== "string") return undefined;
  const trimmed = headerSessionId.trim();
  const parsed = sessionIdStringSchema.safeParse(trimmed);
  return parsed.success ? parsed.data : undefined;
}

export function parsePreferencesQuery(query: unknown): { sessionId: string } | null {
  if (!query || typeof query !== "object") return null;
  const raw = (query as Record<string, unknown>).sessionId;
  const parsed = preferencesQuerySchema.safeParse({ sessionId: raw });
  return parsed.success ? parsed.data : null;
}
