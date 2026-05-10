import type { AudioFingerprint } from "../audio-fingerprint.js";

export type ParityTolerance = Partial<Record<keyof AudioFingerprint, number>>;

export const DEFAULT_PARITY_TOLERANCE: Record<keyof AudioFingerprint, number> = {
  rms: 0.02,
  peak: 0.05,
  zeroCrossingRate: 0.02,
  spectralCentroidApprox: 800,
};

export function fingerprintsWithinTolerance(
  a: AudioFingerprint,
  b: AudioFingerprint,
  tol: ParityTolerance = DEFAULT_PARITY_TOLERANCE,
): boolean {
  const keys = ["rms", "peak", "zeroCrossingRate", "spectralCentroidApprox"] as const;
  for (const k of keys) {
    const t = tol[k] ?? DEFAULT_PARITY_TOLERANCE[k];
    if (Math.abs(a[k] - b[k]) > t) return false;
  }
  return true;
}
