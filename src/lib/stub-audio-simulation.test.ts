import { describe, it, expect } from "vitest";
import { synthesizeStubAudioBuffer } from "./stub-audio-simulation.js";
import { defaultParams } from "./music-schema.js";
import { createSeededRng } from "./rng.js";

describe("stub-audio-simulation", () => {
  it("produces bounded PCM", () => {
    const buf = synthesizeStubAudioBuffer(defaultParams, {
      phase: 0,
      frameLength: 512,
      sampleRate: 48000,
      variant: "reference",
    });
    for (let i = 0; i < buf.length; i++) {
      expect(buf[i]).toBeGreaterThanOrEqual(-1);
      expect(buf[i]).toBeLessThanOrEqual(1);
    }
  });

  it("is repeatable with seeded rng when noiseAmount is non-zero", () => {
    const rng = createSeededRng(999);
    const params = { ...defaultParams, noiseAmount: 0.15 };
    const a = synthesizeStubAudioBuffer(params, {
      phase: 0,
      frameLength: 128,
      sampleRate: 48000,
      rng,
    });
    const rng2 = createSeededRng(999);
    const b = synthesizeStubAudioBuffer(params, {
      phase: 0,
      frameLength: 128,
      sampleRate: 48000,
      rng: rng2,
    });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("creates different PCM between synthesis variants", () => {
    const ref = synthesizeStubAudioBuffer(defaultParams, {
      phase: 0,
      frameLength: 256,
      sampleRate: 48000,
      variant: "reference",
      rng: () => 0.5,
    });
    const tgt = synthesizeStubAudioBuffer(defaultParams, {
      phase: 0,
      frameLength: 256,
      sampleRate: 48000,
      variant: "target",
      rng: () => 0.5,
    });
    let diff = 0;
    for (let i = 0; i < ref.length; i++) diff += Math.abs(ref[i] - tgt[i]);
    expect(diff).toBeGreaterThan(1e-4);
  });
});
