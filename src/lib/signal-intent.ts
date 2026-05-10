import type { AmbientParams } from "./music-schema.js";

/** Normalized affect/control dimensions (0 = low, 1 = high). Used between LLM output and DSP realization. */
export interface MoodSignalIntent {
  arousal: number;
  valence: number;
  tension: number;
  cognitiveLoad: number;
  grounding: number;
}

export function defaultMoodSignalIntent(): MoodSignalIntent {
  return {
    arousal: 0.5,
    valence: 0.5,
    tension: 0.5,
    cognitiveLoad: 0.5,
    grounding: 0.5,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function safeDim(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return clamp01(value);
}

/** Parse optional structured intent from LLM JSON */
export function parseMoodSignalIntent(raw: unknown): MoodSignalIntent | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const arousal = safeDim(o.arousal);
  const valence = safeDim(o.valence);
  const tension = safeDim(o.tension);
  const cognitiveLoad = safeDim(o.cognitiveLoad);
  const grounding = safeDim(o.grounding);
  if ([arousal, valence, tension, cognitiveLoad, grounding].every((v) => v === undefined)) {
    return undefined;
  }
  const base = defaultMoodSignalIntent();
  return {
    arousal: arousal ?? base.arousal,
    valence: valence ?? base.valence,
    tension: tension ?? base.tension,
    cognitiveLoad: cognitiveLoad ?? base.cognitiveLoad,
    grounding: grounding ?? base.grounding,
  };
}

/** Fallback when the model omits moodSignalIntent — keyword-driven coarse priors */
export function inferMoodSignalIntentFromText(mood: string): MoodSignalIntent {
  const m = mood.toLowerCase();
  let tension = 0.45;
  let arousal = 0.45;
  let valence = 0.5;
  let cognitiveLoad = 0.45;
  let grounding = 0.5;

  const highStress = /stress|stressed|anxious|anxiety|panic|overwhelm|overwhelmed|tense/.test(m);

  if (highStress) {
    tension = 0.88;
    arousal = 0.78;
    cognitiveLoad = 0.72;
    grounding = 0.35;
    valence = 0.35;
  }
  if (!highStress && /sad|depressed|low|heavy|sluggish|numb/.test(m)) {
    tension = 0.35;
    arousal = 0.25;
    valence = 0.28;
    cognitiveLoad = 0.35;
    grounding = 0.42;
  }
  if (!highStress && /focus|focused|work|clear|neutral|ok|fine/.test(m)) {
    cognitiveLoad = 0.62;
    tension = 0.42;
    arousal = 0.48;
    valence = 0.55;
    grounding = 0.55;
  }
  if (!highStress && /calm|peace|peaceful|rest|relaxed|safe|ground/.test(m)) {
    tension = 0.22;
    arousal = 0.28;
    valence = 0.62;
    grounding = 0.78;
    cognitiveLoad = 0.32;
  }

  return {
    arousal: clamp01(arousal),
    valence: clamp01(valence),
    tension: clamp01(tension),
    cognitiveLoad: clamp01(cognitiveLoad),
    grounding: clamp01(grounding),
  };
}

/**
 * Deterministic post-processing: strengthens mood→audio mapping beyond raw LLM params.
 * Higher tension → softer motion & safer dynamics; higher grounding → warmer low-mid bias.
 */
export function realizeAmbientParamsFromIntent(intent: MoodSignalIntent, params: AmbientParams): AmbientParams {
  const t = intent.tension;
  const g = intent.grounding;
  const cl = intent.cognitiveLoad;

  const complexityScale = 1 - 0.45 * t;
  const lfoScale = 1 - 0.35 * t + 0.12 * cl;
  const noiseBias = 0.15 * t - 0.05 * g;
  const freqTowardLow = 1 - 0.25 * g * (1 - intent.valence * 0.3);

  const baseFreq = Math.max(40, Math.min(440, params.baseFrequency * freqTowardLow));

  const merged: AmbientParams = {
    ...params,
    baseFrequency: baseFreq,
    complexity: Math.max(0, Math.min(1, params.complexity * complexityScale)),
    lfoSpeed: Math.max(0.01, Math.min(1, params.lfoSpeed * lfoScale)),
    noiseAmount: Math.max(0, Math.min(1, params.noiseAmount + noiseBias)),
    delayFeedback: Math.max(0, Math.min(0.9, params.delayFeedback * (1 - 0.25 * t))),
    attackTime: Math.max(0.1, Math.min(10, params.attackTime * (1 + 0.35 * t))),
    releaseTime: Math.max(0.1, Math.min(20, params.releaseTime * (1 + 0.25 * t))),
    reverbWet: Math.max(0, Math.min(1, params.reverbWet + 0.12 * t - 0.05 * cl)),
    filterCutoffMax: Math.max(200, Math.min(5000, params.filterCutoffMax * (1 - 0.15 * t))),
  };

  return applyIntensitySafetyCaps(intent, merged);
}

/**
 * Hard caps for high tension + high arousal — reduces harsh motion and FM brightness.
 */
export function applyIntensitySafetyCaps(intent: MoodSignalIntent, params: AmbientParams): AmbientParams {
  const stress = (intent.tension + intent.arousal) / 2;
  if (stress <= 0.72) return params;

  const intensity = Math.min(1, (stress - 0.72) / 0.28);
  const complexityCap = 1 - 0.35 * intensity;
  const modCap = 1 - 0.45 * intensity;
  const harmCap = 1 - 0.2 * intensity;

  return {
    ...params,
    complexity: Math.max(0, Math.min(1, params.complexity * complexityCap)),
    modulationIndex: Math.max(0, Math.min(10, params.modulationIndex * modCap)),
    harmonicity: Math.max(0.1, Math.min(5, params.harmonicity * harmCap)),
    filterCutoffMax: Math.max(200, Math.min(5000, params.filterCutoffMax * (1 - 0.12 * intensity))),
  };
}

/** Short template line tying heard qualities to intent (no extra LLM call). */
export function buildSoftExplainLine(intent: MoodSignalIntent, params: AmbientParams): string {
  const warmth =
    intent.grounding > 0.62 ? "warmer low anchors" : intent.grounding < 0.38 ? "lighter footprint" : "balanced weight";
  const motion =
    intent.tension > 0.62 ? "slower motion and softer dynamics" : intent.tension < 0.35 ? "gentle drift" : "steady motion";
  const space = params.reverbWet > 0.72 ? "more spacious tail" : params.reverbWet < 0.42 ? "closer, drier presence" : "moderate space";

  return `Tuned for ${warmth}, ${motion}, and ${space} — aligned with how you showed up just now.`;
}
