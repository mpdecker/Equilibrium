import { describe, it, expect } from "vitest";
import { computeShadowComparison } from "./audio-shadow.js";
import { defaultParams, validateMusicParams } from "./music-schema.js";
import { computeSyntheticFingerprintFromParams } from "./audio-fingerprint.js";
import { fingerprintsWithinTolerance } from "./engine/parity.js";

describe("audio shadow comparison", () => {
  it("marks PCM reference/target synthesis fingerprints within tolerance", () => {
    const result = computeShadowComparison(defaultParams);
    expect(result.withinTolerance).toBe(true);
  });

  it("reference and target fingerprints differ (non-identical)", () => {
    const result = computeShadowComparison(defaultParams);
    expect(result.reference).not.toEqual(result.target);
  });

  it("produces expected structure for stressed-like params", () => {
    const params = validateMusicParams({
      baseFrequency: 55,
      complexity: 0.25,
      lfoSpeed: 0.03,
      harmonicity: 1.2,
      filterCutoffMax: 650,
      noiseAmount: 0.35,
    });
    const result = computeShadowComparison(params);
    expect(result.reference).toBeDefined();
    expect(result.target).toBeDefined();
    expect(typeof result.withinTolerance).toBe("boolean");
    expect(result.reference.rms).toBeGreaterThanOrEqual(0);
    expect(result.target.peak).toBeGreaterThanOrEqual(0);
  });

  it("synthetic fingerprints also resolve within tolerance for default params", () => {
    const a = computeSyntheticFingerprintFromParams(defaultParams, "reference");
    const b = computeSyntheticFingerprintFromParams(defaultParams, "target");
    expect(fingerprintsWithinTolerance(a, b)).toBe(true);
  });
});
