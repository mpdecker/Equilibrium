import { describe, it, expect } from "vitest";
import { computeFingerprint, computeSyntheticFingerprintFromParams } from "./audio-fingerprint.js";
import { defaultParams, validateMusicParams } from "./music-schema.js";

describe("audio fingerprint", () => {
  it("computes zero RMS for silence", () => {
    const buf = new Float32Array(512);
    const fp = computeFingerprint(buf, 48000);
    expect(fp.rms).toBe(0);
    expect(fp.peak).toBe(0);
  });

  it("handles empty buffer", () => {
    const buf = new Float32Array(0);
    const fp = computeFingerprint(buf, 48000);
    expect(fp.rms).toBe(0);
    expect(fp.peak).toBe(0);
    expect(fp.zeroCrossingRate).toBe(0);
    expect(fp.spectralCentroidApprox).toBe(0);
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

  it("computes non-zero crossing rate for alternating signal", () => {
    const buf = new Float32Array(256);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = i % 2 === 0 ? 0.5 : -0.5;
    }
    const fp = computeFingerprint(buf, 48000);
    expect(fp.zeroCrossingRate).toBeGreaterThan(0.9);
  });

  it("computes near-zero crossing rate for all-positive signal", () => {
    const buf = new Float32Array(256).fill(0.3);
    const fp = computeFingerprint(buf, 48000);
    expect(fp.zeroCrossingRate).toBe(0);
  });

  it("synthetic fingerprint differs slightly between reference and target variants", () => {
    const a = computeSyntheticFingerprintFromParams(defaultParams, "reference");
    const b = computeSyntheticFingerprintFromParams(defaultParams, "target");
    expect(a.rms).not.toBe(b.rms);
  });

  it("synthetic fingerprint produces bounded values for extreme params", () => {
    const params = validateMusicParams({
      baseFrequency: 20000,
      complexity: 1,
      lfoSpeed: 5,
      harmonicity: 10,
      filterCutoffMax: 20000,
      noiseAmount: 1,
      delayFeedback: 1,
      phaserFrequency: 5,
    });
    const fp = computeSyntheticFingerprintFromParams(params, "reference");
    expect(fp.rms).toBeGreaterThanOrEqual(0);
    expect(fp.rms).toBeLessThanOrEqual(1);
    expect(fp.peak).toBeGreaterThanOrEqual(0);
    expect(fp.peak).toBeLessThanOrEqual(1);
    expect(fp.zeroCrossingRate).toBeGreaterThanOrEqual(0);
    expect(fp.zeroCrossingRate).toBeLessThanOrEqual(1);
    expect(fp.spectralCentroidApprox).toBeGreaterThanOrEqual(0);
    expect(fp.spectralCentroidApprox).toBeLessThanOrEqual(20000);
  });

  it("synthetic fingerprint returns zero rms for silent params", () => {
    const params = validateMusicParams({
      baseFrequency: 110,
      complexity: 0,
      lfoSpeed: 0,
      harmonicity: 0,
      filterCutoffMax: 200,
      noiseAmount: 0,
      delayFeedback: 0,
      phaserFrequency: 0,
    });
    const fp = computeSyntheticFingerprintFromParams(params, "reference");
    expect(fp.rms).toBe(0);
  });
});
