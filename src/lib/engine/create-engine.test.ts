import { describe, it, expect } from "vitest";
import { createAmbientEngine } from "./create-engine.js";
import { defaultParams } from "../music-schema.js";
import { createSeededRng } from "../rng.js";
import { PreviewAmbientEngine } from "./stub-engine.js";
import { WorkletAmbientEngine } from "./worklet-ambient-engine.js";

describe("createAmbientEngine", () => {
  it("returns preview/stub implementation when engineMode is stub", async () => {
    const engine = createAmbientEngine({
      engineMode: "stub",
      rng: createSeededRng(3),
    });
    expect(engine).toBeInstanceOf(PreviewAmbientEngine);
    await engine.start();
    expect(engine.getAnalyser().getValue().length).toBeGreaterThan(0);
    engine.dispose();
  });

  it("accepts preview as alias for the PCM preview implementation", async () => {
    const engine = createAmbientEngine({ engineMode: "preview", rng: createSeededRng(9) });
    expect(engine).toBeInstanceOf(PreviewAmbientEngine);
    await engine.start();
    expect(engine.getAnalyser().getValue().some((x) => x !== 0)).toBe(true);
    engine.dispose();
  });

  it("passes seeded rng through to stub implementation", async () => {
    const mk = () =>
      createAmbientEngine({
        engineMode: "stub",
        rng: createSeededRng(42),
      });
    const engine = mk();
    const engine2 = mk();
    await engine.start();
    await engine2.start();
    engine.applyParams({ ...defaultParams, noiseAmount: 0.08 });
    engine2.applyParams({ ...defaultParams, noiseAmount: 0.08 });
    expect(Array.from(engine.getAnalyser().getValue())).toEqual(
      Array.from(engine2.getAnalyser().getValue()),
    );
    engine.dispose();
    engine2.dispose();
  });

  it("returns WorkletAmbientEngine when engineMode is wasm", () => {
    const engine = createAmbientEngine({ engineMode: "wasm" });
    expect(engine).toBeInstanceOf(WorkletAmbientEngine);
    engine.dispose();
  });
});
