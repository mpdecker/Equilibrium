import { describe, it, expect } from "vitest";
import {
  fingerprintsWithinTolerance,
  DEFAULT_PARITY_TOLERANCE,
} from "./parity.js";
import type { AudioFingerprint } from "../audio-fingerprint.js";

describe("fingerprintsWithinTolerance", () => {
  it("accepts identical fingerprints", () => {
    const fp: AudioFingerprint = {
      rms: 0.1,
      peak: 0.3,
      zeroCrossingRate: 0.05,
      spectralCentroidApprox: 1200,
    };
    expect(fingerprintsWithinTolerance(fp, fp)).toBe(true);
  });

  it("rejects when RMS diverges beyond default tolerance", () => {
    const a: AudioFingerprint = {
      rms: 0.1,
      peak: 0.2,
      zeroCrossingRate: 0.04,
      spectralCentroidApprox: 1000,
    };
    const b: AudioFingerprint = { ...a, rms: 0.13 };
    expect(fingerprintsWithinTolerance(a, b)).toBe(false);
  });

  it("respects custom tolerance overrides", () => {
    const a: AudioFingerprint = {
      rms: 0.1,
      peak: 0.2,
      zeroCrossingRate: 0.04,
      spectralCentroidApprox: 1000,
    };
    const b: AudioFingerprint = { ...a, rms: 0.12 };
    expect(fingerprintsWithinTolerance(a, b, { ...DEFAULT_PARITY_TOLERANCE, rms: 0.03 })).toBe(true);
  });
});
