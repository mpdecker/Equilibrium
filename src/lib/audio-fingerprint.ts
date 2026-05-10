import type { AmbientParams } from "./music-schema.js";
import {
  magnitudeSpectrumFromReal,
  nextPowerOf2,
  spectralCentroidFromMagnitudes,
} from "./dsp/fft.js";

/** Lightweight fingerprint for regression / shadow comparison (not ITU-R BS.1770 loudness). */
export type AudioFingerprint = {
  rms: number;
  peak: number;
  zeroCrossingRate: number;
  spectralCentroidApprox: number;
};

export function computeFingerprint(buffer: Float32Array, sampleRate: number): AudioFingerprint {
  if (buffer.length === 0) {
    return { rms: 0, peak: 0, zeroCrossingRate: 0, spectralCentroidApprox: 0 };
  }
  let sumSq = 0;
  let peak = 0;
  let crossings = 0;
  let prev = buffer[0];
  for (let i = 0; i < buffer.length; i++) {
    const x = buffer[i];
    sumSq += x * x;
    const ax = Math.abs(x);
    if (ax > peak) peak = ax;
    if (i > 0 && prev * x < 0) crossings++;
    prev = x;
  }
  const rms = Math.sqrt(sumSq / buffer.length);
  const zcr = crossings / buffer.length;

  const fftSize = nextPowerOf2(Math.max(512, buffer.length));
  const mags = magnitudeSpectrumFromReal(buffer, fftSize);
  const centroidHz = spectralCentroidFromMagnitudes(mags, sampleRate, fftSize);

  return { rms, peak, zeroCrossingRate: zcr, spectralCentroidApprox: centroidHz };
}

/**
 * Parameter-only fingerprint — cheap control-plane summary (no PCM / FFT).
 * `variant` models a tiny hypothetical engine drift for regression hooks.
 */
export function computeSyntheticFingerprintFromParams(
  params: AmbientParams,
  variant: "reference" | "target",
): AudioFingerprint {
  const drift = variant === "target" ? 1.015 : 1;
  const velBoost =
    (params.volume + 40) / 40 +
    (params.droneVolume + 40) / 120 +
    (params.complexity + params.noiseAmount) / 2;
  const rms = Math.max(0, Math.min(1, (params.complexity * 0.08 + params.noiseAmount * 0.05) * drift * velBoost));
  const peak = Math.min(1, rms * (3 + params.delayFeedback * 2) * drift);
  const zcr = Math.min(
    1,
    (params.lfoSpeed + params.phaserFrequency * 0.05 + params.harmonicity * 0.03) * 0.12 * drift,
  );
  const centroid = Math.min(
    20000,
    params.filterCutoffMax * (0.25 + params.complexity * 0.5 + params.harmonicity * 0.05) * drift,
  );
  return {
    rms,
    peak,
    zeroCrossingRate: zcr,
    spectralCentroidApprox: centroid,
  };
}
