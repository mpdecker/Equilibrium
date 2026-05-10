import type { AmbientParams } from "./music-schema.js";
import { computeFingerprint, type AudioFingerprint } from "./audio-fingerprint.js";
import { synthesizeStubAudioBuffer } from "./stub-audio-simulation.js";
import { fingerprintsWithinTolerance, type ParityTolerance } from "./engine/parity.js";

export type ShadowComparisonResult = {
  reference: AudioFingerprint;
  target: AudioFingerprint;
  withinTolerance: boolean;
};

const SHADOW_SAMPLE_RATE = 48000;
const SHADOW_FRAME = 2048;

/**
 * Compares FFT fingerprints of two PCM previews from the same params (`reference` vs `target` synthesis variants).
 * Mirrors the drift budget expected when a second native engine differs slightly from the preview path.
 */
export function computeShadowComparison(params: AmbientParams): ShadowComparisonResult {
  const refBuf = synthesizeStubAudioBuffer(params, {
    phase: 0,
    frameLength: SHADOW_FRAME,
    sampleRate: SHADOW_SAMPLE_RATE,
    variant: "reference",
  });
  const tgtBuf = synthesizeStubAudioBuffer(params, {
    phase: 0,
    frameLength: SHADOW_FRAME,
    sampleRate: SHADOW_SAMPLE_RATE,
    variant: "target",
  });
  const reference = computeFingerprint(refBuf, SHADOW_SAMPLE_RATE);
  const target = computeFingerprint(tgtBuf, SHADOW_SAMPLE_RATE);
  return {
    reference,
    target,
    withinTolerance: fingerprintsWithinTolerance(reference, target, SHADOW_PCM_TOLERANCE),
  };
}

/** Tuned for small harmonic / detune deltas between reference/target synthesis variants */
const SHADOW_PCM_TOLERANCE: ParityTolerance = {
  rms: 0.045,
  peak: 0.075,
  zeroCrossingRate: 0.04,
  spectralCentroidApprox: 2600,
};
