import { describe, it, expect } from "vitest";
import {
  fftComplex,
  magnitudeSpectrumFromReal,
  nextPowerOf2,
  spectralCentroidFromMagnitudes,
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
});
