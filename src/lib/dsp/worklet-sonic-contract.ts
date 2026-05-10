/**
 * Contract for the lightweight AudioWorklet preview path (`equilibrium-dsp`).
 * Tone.js-backed engines implement the full `AmbientParams` surface.
 */

import type { AmbientParams } from "../music-schema.js";

export const WORKLET_DSP_SUPPORTED_KEYS = [
  "baseFrequency",
  "chordIntervals",
  "complexity",
  "harmonicity",
  "noiseAmount",
  "lfoSpeed",
  "chorusDepth",
  "delayFeedback",
  "filterCutoffMax",
] as const satisfies readonly (keyof AmbientParams)[];

/** Keys omitted from DSP but forwarded in JSON for UI / palettes (ignored by PCM loop). */
export const WORKLET_DSP_NON_DSP_KEYS_SENT = ["colorPalette", "oscillatorType", "noiseType"] as const;
