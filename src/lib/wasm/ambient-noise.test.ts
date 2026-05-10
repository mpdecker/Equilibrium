import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deterministicWorkletNoise, synthesizeWorkletPreviewInto } from "../dsp/preview-worklet-match.js";
import { defaultParams } from "../music-schema.js";

const wasmPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../public/wasm/equilibrium_dsp.wasm",
);

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

describe("equilibrium_dsp.wasm", () => {
  let exports: WebAssembly.Exports | null = null;

  beforeAll(async () => {
    const bytes = readFileSync(wasmPath);
    const inst = await WebAssembly.instantiate(bytes, {
      env: {
        sin: Math.sin,
        floor: Math.floor,
        pow: Math.pow,
      },
    });
    exports = inst.instance.exports;
  });

  describe("noiseAt", () => {
    it("matches JS deterministic noise envelope", () => {
      expect(exports).toBeTruthy();
      const noiseAt = exports!.noiseAt as (phase: number, i: number) => number;
      const phase = 137.251;
      for (let i = 0; i < 20; i++) {
        expect(noiseAt(phase, i)).toBeCloseTo(deterministicWorkletNoise(phase, i), 10);
      }
    });
  });

  describe("renderBlock", () => {
    it("matches synthesizeWorkletPreviewInto buffer and phase advance", () => {
      expect(exports).toBeTruthy();
      const noiseAtExp = exports!.noiseAt;
      const rb = exports!.renderBlock as (
        phase0: number,
        n: number,
        sr: number,
        speed: number,
        pole: number,
        amp: number,
        fund: number,
        noiseAmt: number,
        delayMix: number,
        lfoSp: number,
        chorDepth: number,
        maxChord: number,
        maxH: number,
      ) => number;
      const memory = exports!.memory as WebAssembly.Memory;
      expect(typeof noiseAtExp).toBe("function");
      expect(typeof rb).toBe("function");
      expect(memory).toBeInstanceOf(WebAssembly.Memory);

      const params = defaultParams;
      const frame = 256;
      const sr = 48_000;
      const evolutionSpeed01 = 0.58;
      const phase0 = 91.742;

      const intervals =
        params.chordIntervals.length > 0 ? params.chordIntervals : [0];
      const fund = Math.max(20, Number(params.baseFrequency) || 110);
      const complexity = clamp(Number(params.complexity), 0, 1);
      const harmonicity = clamp(Number(params.harmonicity), 0.1, 5);
      const noiseAmount = clamp(Number(params.noiseAmount), 0, 1);
      const lfoSpeed = clamp(Number(params.lfoSpeed), 0.01, 2);
      const chorusDepth = clamp(Number(params.chorusDepth), 0, 1);
      const delayFeedback = clamp(Number(params.delayFeedback), 0, 0.9);
      const filterCutoffMax = clamp(
        Number.isFinite(params.filterCutoffMax) ? params.filterCutoffMax : 800,
        200,
        5000,
      );
      const amp =
        0.14 *
        (0.35 + complexity * 0.65) *
        (0.85 + Math.min(harmonicity, 5) * 0.04);
      const speed = clamp(0.35 + evolutionSpeed01 * 1.15, 0.05, 4);
      const pole = Math.exp((-2 * Math.PI * filterCutoffMax) / sr);
      const delayMix = 0.92 + delayFeedback * 0.08;
      const maxChord = Math.min(6, intervals.length);
      const maxH = Math.min(8, 2 + Math.floor(harmonicity));

      const monoTs = new Float32Array(frame);
      let lpTs = { z: 0 };
      const phaseAfterTs = synthesizeWorkletPreviewInto(
        params,
        evolutionSpeed01,
        phase0,
        frame,
        sr,
        monoTs,
        lpTs,
      );

      const f64 = new Float64Array(memory.buffer);
      f64[0] = 0;
      for (let k = 0; k < 6; k++) {
        f64[8 + k] = k < intervals.length ? Number(intervals[k]) || 0 : 0;
      }

      const phaseAfterWasm = rb(
        phase0,
        frame,
        sr,
        speed,
        pole,
        amp,
        fund,
        noiseAmount,
        delayMix,
        lfoSpeed,
        chorusDepth,
        maxChord,
        maxH,
      );

      const outWasm = new Float64Array(memory.buffer, 2048, frame);
      expect(phaseAfterWasm).toBeCloseTo(phaseAfterTs, 4);

      let maxAbs = 0;
      for (let i = 0; i < frame; i++) {
        maxAbs = Math.max(maxAbs, Math.abs(outWasm[i] - monoTs[i]));
      }
      expect(maxAbs).toBeLessThan(0.025);
      expect(f64[0]).toBeCloseTo(lpTs.z, 6);
    });
  });
});
