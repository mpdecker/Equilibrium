import { describe, it, expect } from "vitest";
import { computeSyntheticFingerprintFromParams } from "../audio-fingerprint.js";
import { fingerprintsWithinTolerance } from "./parity.js";
import { validateMusicParams } from "../music-schema.js";

describe("parity scenarios (calm / focus / stressed)", () => {
  const calm = validateMusicParams({
    baseFrequency: 73,
    complexity: 0.2,
    lfoSpeed: 0.05,
    reverbWet: 0.9,
    noiseAmount: 0.2,
    harmonicity: 2,
    filterCutoffMax: 900,
    delayFeedback: 0.35,
    phaserFrequency: 0.5,
  });

  const focus = validateMusicParams({
    baseFrequency: 110,
    complexity: 0.55,
    lfoSpeed: 0.15,
    reverbWet: 0.45,
    noiseAmount: 0.05,
    harmonicity: 3,
    filterCutoffMax: 2200,
    delayFeedback: 0.5,
    phaserFrequency: 0.8,
  });

  const stressed = validateMusicParams({
    baseFrequency: 55,
    complexity: 0.25,
    lfoSpeed: 0.03,
    reverbWet: 0.88,
    noiseAmount: 0.35,
    harmonicity: 1.2,
    filterCutoffMax: 650,
    delayFeedback: 0.25,
    phaserFrequency: 0.35,
  });

  it("focus fingerprint differs from calm with higher centroid heuristic", () => {
    const a = computeSyntheticFingerprintFromParams(calm, "reference");
    const b = computeSyntheticFingerprintFromParams(focus, "reference");
    expect(b.spectralCentroidApprox).toBeGreaterThan(a.spectralCentroidApprox);
  });

  it("stressed retains drift parity tolerance vs sibling variant", () => {
    const ref = computeSyntheticFingerprintFromParams(stressed, "reference");
    const tgt = computeSyntheticFingerprintFromParams(stressed, "target");
    expect(fingerprintsWithinTolerance(ref, tgt)).toBe(true);
  });
});
