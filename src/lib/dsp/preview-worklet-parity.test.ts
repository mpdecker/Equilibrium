import { describe, it, expect } from "vitest";
import { defaultParams } from "../music-schema.js";
import {
  synthesizeWorkletPreviewInto,
  synthesizeWorkletPreviewBuffer,
  deterministicWorkletNoise,
} from "./preview-worklet-match.js";

const SR = 48_000;
const FRAME = 256;

describe("preview DSP (worklet-aligned)", () => {
  it("chains two buffers identically vs one contiguous block", () => {
    let phase = 12.345;
    const evo = 0.61;
    const lpStitched = { z: 0 };
    const lpCombo = { z: 0 };
    const a = new Float32Array(FRAME);
    const b = new Float32Array(FRAME);
    phase = synthesizeWorkletPreviewInto(defaultParams, evo, phase, FRAME, SR, a, lpStitched);
    phase = synthesizeWorkletPreviewInto(defaultParams, evo, phase, FRAME, SR, b, lpStitched);

    let phaseOnce = 12.345;
    const combo = new Float32Array(FRAME * 2);
    phaseOnce = synthesizeWorkletPreviewInto(
      defaultParams,
      evo,
      phaseOnce,
      FRAME * 2,
      SR,
      combo,
      lpCombo,
    );

    const stitch = new Float32Array(FRAME * 2);
    stitch.set(a, 0);
    stitch.set(b, FRAME);

    expect(phaseOnce).toBeCloseTo(phase, 5);
    expect(stitch.length).toBe(combo.length);
    let maxAbs = 0;
    for (let i = 0; i < stitch.length; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(stitch[i] - combo[i]));
    }
    expect(maxAbs).toBeLessThan(0.02);
  });

  it("exported buffer helper agrees with Into", () => {
    const { buffer, phaseAfter } = synthesizeWorkletPreviewBuffer(
      defaultParams,
      0.4,
      0,
      128,
      SR,
    );
    const manual = new Float32Array(128);
    const p2 = synthesizeWorkletPreviewInto(defaultParams, 0.4, 0, 128, SR, manual);
    expect(phaseAfter).toBe(p2);
    for (let i = 0; i < manual.length; i++) {
      expect(buffer[i]).toBeCloseTo(manual[i], 6);
    }
  });
});

describe("deterministicWorkletNoise", () => {
  it("produces values in [0, 1)", () => {
    for (let s = 0; s < 100; s++) {
      for (let i = 0; i < 50; i++) {
        const v = deterministicWorkletNoise(s, i);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it("is deterministic for same inputs", () => {
    const a = deterministicWorkletNoise(42, 7);
    const b = deterministicWorkletNoise(42, 7);
    expect(a).toBe(b);
  });

  it("varies with different phase or index", () => {
    const base = deterministicWorkletNoise(0, 0);
    const diffPhase = deterministicWorkletNoise(1, 0);
    const diffIndex = deterministicWorkletNoise(0, 1);
    expect(diffPhase).not.toBe(base);
    expect(diffIndex).not.toBe(base);
  });
});
