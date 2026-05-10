import { describe, it, expect } from "vitest";
import { computeFingerprint, computeSyntheticFingerprintFromParams } from "./audio-fingerprint.js";
import { defaultParams } from "./music-schema.js";

describe("audio fingerprint", () => {
  it("computes zero RMS for silence", () => {
    const buf = new Float32Array(512);
    const fp = computeFingerprint(buf, 48000);
    expect(fp.rms).toBe(0);
    expect(fp.peak).toBe(0);
  });

  it("computes centroid near a dominant sine tone", () => {
    const sr = 48000;
    const n = 2048;
    const f = 330;
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      buf[i] = 0.35 * Math.sin((2 * Math.PI * f * i) / sr);
    }
    const fp = computeFingerprint(buf, sr);
    expect(fp.spectralCentroidApprox).toBeGreaterThan(f * 0.72);
    expect(fp.spectralCentroidApprox).toBeLessThan(f * 1.28);
    expect(fp.rms).toBeGreaterThan(0.05);
  });

  it("synthetic fingerprint differs slightly between reference and target variants", () => {
    const a = computeSyntheticFingerprintFromParams(defaultParams, "reference");
    const b = computeSyntheticFingerprintFromParams(defaultParams, "target");
    expect(a.rms).not.toBe(b.rms);
  });
});
