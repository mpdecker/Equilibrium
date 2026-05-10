import { describe, it, expect } from "vitest";
import { PreviewAmbientEngine, StubAmbientEngine } from "./stub-engine.js";
import { defaultParams } from "../music-schema.js";
import { createSeededRng } from "../rng.js";

describe("StubAmbientEngine / PreviewAmbientEngine", () => {
  it("exposes PreviewAmbientEngine as the canonical constructor", () => {
    expect(PreviewAmbientEngine).toBe(StubAmbientEngine);
  });

  it("returns silence until started", async () => {
    const engine = new StubAmbientEngine({ rng: createSeededRng(1) });
    expect(Array.from(engine.getAnalyser().getValue()).every((x) => x === 0)).toBe(true);
    await engine.start();
    const v = engine.getAnalyser().getValue();
    expect(v.some((x) => Math.abs(x) > 1e-6)).toBe(true);
    engine.stop();
    expect(Array.from(engine.getAnalyser().getValue()).every((x) => x === 0)).toBe(true);
    engine.dispose();
  });

  it("advances phase while playing", async () => {
    const engine = new StubAmbientEngine({ rng: () => 0.5 });
    await engine.start();
    engine.applyParams({ ...defaultParams, noiseAmount: 0 });
    engine.getAnalyser().getValue();
    const p1 = engine.getPhase();
    engine.getAnalyser().getValue();
    const p2 = engine.getPhase();
    expect(p2).toBeGreaterThan(p1);
    engine.dispose();
  });

  it("reflects applyParams in analyser output (deterministic rng)", async () => {
    const rng = createSeededRng(777);
    const engine = new StubAmbientEngine({ rng });
    await engine.start();
    engine.applyParams({ ...defaultParams, baseFrequency: 55, noiseAmount: 0, complexity: 0.2 });
    const a = Float32Array.from(engine.getAnalyser().getValue());
    engine.applyParams({ ...defaultParams, baseFrequency: 220, noiseAmount: 0, complexity: 0.9 });
    const b = Float32Array.from(engine.getAnalyser().getValue());
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) mismatch += Math.abs(a[i] - b[i]);
    expect(mismatch).toBeGreaterThan(1e-5);
    engine.dispose();
  });
});
