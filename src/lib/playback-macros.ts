import type { AmbientParams } from "./music-schema.js";

/** Scales motion / modulation (LFO, chorus drive via complexity, FM depth). */
export function applyPlaybackIntensityMacro(base: AmbientParams, intensity01: number): AmbientParams {
  const i = Math.max(0.35, Math.min(1, intensity01));
  return {
    ...base,
    complexity: Math.max(0, Math.min(1, base.complexity * i)),
    lfoSpeed: Math.max(0.01, Math.min(1, base.lfoSpeed * (0.65 + 0.35 * i))),
    modulationIndex: Math.max(0, Math.min(10, base.modulationIndex * (0.72 + 0.28 * i))),
  };
}

/** Tone / space “brightness” orthogonal to motion — filter, harmonic spread, air. */
export function applyPlaybackBrightnessMacro(base: AmbientParams, brightness01: number): AmbientParams {
  const b = Math.max(0.35, Math.min(1, brightness01));
  return {
    ...base,
    filterCutoffMax: Math.max(
      200,
      Math.min(5000, base.filterCutoffMax * (0.78 + 0.22 * b)),
    ),
    harmonicity: Math.max(0.1, Math.min(5, base.harmonicity * (0.92 + 0.08 * b))),
    reverbWet: Math.max(0, Math.min(1, base.reverbWet * (0.92 + 0.08 * b))),
  };
}
