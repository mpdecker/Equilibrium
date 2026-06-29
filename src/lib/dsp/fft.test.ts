import { describe, it, expect } from "vitest";
import {
  fftComplex,
  magnitudeSpectrumFromReal,
  nextPowerOf2,
  spectralCentroidFromMagnitudes,
  hannWindowSample,
} from "./fft.js";

describe("dsp/fft", () => {
  it("computes DC bin energy for constant signal", () => {
    const n = 32;
    const x = new Float32Array(n).fill(1);
    const { re, im } = fftComplex(x);
    expect(re[0]).toBeCloseTo(n, 4);
    expect(im[0]).toBeCloseTo(0, 6);
    let energyOthers = 0;
    for (let i = 1; i < n; i++) {
      energyOthers += re[i] * re[i] + im[i] * im[i];
    }
    expect(energyOthers).toBeLessThan(1e-3);
  });

  it("locates spectral peak near a pure sine frequency", () => {
    const sr = 48000;
    const n = 4096;
    const f = 880;
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      buf[i] = Math.sin((2 * Math.PI * f * i) / sr);
    }
    const fftSize = nextPowerOf2(n);
    const mags = magnitudeSpectrumFromReal(buf, fftSize);
    let peakBin = -1;
    let peakVal = -1;
    for (let k = 1; k < mags.length - 1; k++) {
      if (mags[k] > peakVal) {
        peakVal = mags[k];
        peakBin = k;
      }
    }
    const expectedBin = Math.round((f * fftSize) / sr);
    expect(Math.abs(peakBin - expectedBin)).toBeLessThanOrEqual(3);

    const centroid = spectralCentroidFromMagnitudes(mags, sr, fftSize);
    expect(centroid).toBeGreaterThan(f * 0.85);
    expect(centroid).toBeLessThan(f * 1.15);
  });

  it("handles minimum supported FFT sizes", () => {
    const x = new Float32Array([1, -1, 1, -1]);
    const { re, im } = fftComplex(x);
    expect(re.length).toBe(4);
    expect(im.length).toBe(4);
    expect(Number.isFinite(re[0])).toBe(true);
  });

  it("nextPowerOf2 handles edge cases", () => {
    expect(nextPowerOf2(0)).toBe(2);
    expect(nextPowerOf2(1)).toBe(2);
    expect(nextPowerOf2(2)).toBe(2);
    expect(nextPowerOf2(3)).toBe(4);
    expect(nextPowerOf2(512)).toBe(512);
  });
});

describe("hannWindowSample", () => {
  it("returns 1 for length <= 1", () => {
    expect(hannWindowSample(0, 0)).toBe(1);
    expect(hannWindowSample(0, 1)).toBe(1);
  });

  it("returns range [0,1] for typical length", () => {
    const n = 256;
    for (let i = 0; i < n; i++) {
      const w = hannWindowSample(i, n);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
    }
  });

  it("is symmetric around center", () => {
    const n = 128;
    expect(hannWindowSample(0, n)).toBeCloseTo(hannWindowSample(n - 1, n), 6);
    expect(hannWindowSample(10, n)).toBeCloseTo(hannWindowSample(n - 11, n), 6);
  });

  it("peaks at center for even length", () => {
    const n = 256;
    const mid = hannWindowSample(Math.floor(n / 2), n);
    expect(mid).toBeCloseTo(1, 4);
  });
});

describe("spectralCentroidFromMagnitudes", () => {
  it("returns 0 when all magnitudes are zero", () => {
    const mags = new Float32Array(128);
    const centroid = spectralCentroidFromMagnitudes(mags, 48000, 256);
    expect(centroid).toBe(0);
  });

  it("returns 0 for single-bin edge case", () => {
    const mags = new Float32Array(2);
    mags[0] = 1;
    const centroid = spectralCentroidFromMagnitudes(mags, 48000, 4);
    expect(centroid).toBe(0);
  });
});
