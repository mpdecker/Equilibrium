import type { AmbientParams } from "./music-schema.js";

export type StubAudioVariant = "reference" | "target";

export type SynthesizeStubAudioOptions = {
  phase: number;
  frameLength: number;
  sampleRate: number;
  variant?: StubAudioVariant;
  rng?: () => number;
};

function defaultRng(): number {
  return Math.random();
}

/**
 * The browser preview engine uses `preview-worklet-match.ts` to mirror this path; shadow comparisons use harmonic stretch variants below.
 */
export function synthesizeStubAudioInto(
  params: AmbientParams,
  options: SynthesizeStubAudioOptions,
  out: Float32Array,
): void {
  const {
    phase,
    frameLength,
    sampleRate,
    variant = "reference",
    rng = defaultRng,
  } = options;

  const harmonicGain = variant === "target" ? 1.045 : 1;
  const partialStretch = variant === "target" ? 1.008 : 1;

  const intervals =
    params.chordIntervals.length > 0 ? params.chordIntervals : [0];
  const fund = Math.max(20, params.baseFrequency);
  const amp =
    0.14 *
    (0.35 + params.complexity * 0.65) *
    (0.85 + Math.min(params.harmonicity, 5) * 0.04);

  for (let i = 0; i < frameLength; i++) {
    const t = (phase + i) / sampleRate;
    let s = 0;
    let nVoices = 0;
    for (const iv of intervals.slice(0, 6)) {
      const f = fund * Math.pow(2, iv / 12);
      s += Math.sin(2 * Math.PI * f * partialStretch * t);
      nVoices++;
    }
    if (nVoices > 0) s /= nVoices;

    const maxH = Math.min(8, 2 + Math.floor(params.harmonicity));
    for (let h = 2; h <= maxH; h++) {
      s +=
        harmonicGain *
        (0.11 / h) *
        Math.sin(2 * Math.PI * fund * h * partialStretch * t);
    }

    const lfoSlow =
      Math.sin(2 * Math.PI * Math.min(params.lfoSpeed, 2) * t) *
      0.06 *
      params.chorusDepth;
    s *= 1 + lfoSlow;

    const noise = (rng() * 2 - 1) * params.noiseAmount * 0.22;
    const v = amp * s + noise;
    out[i] = Math.max(-1, Math.min(1, v));
  }
}

export function synthesizeStubAudioBuffer(
  params: AmbientParams,
  options: SynthesizeStubAudioOptions,
): Float32Array {
  const out = new Float32Array(options.frameLength);
  synthesizeStubAudioInto(params, options, out);
  return out;
}
