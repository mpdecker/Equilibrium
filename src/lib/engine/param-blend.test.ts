import { describe, it, expect } from "vitest";
import { cloneAmbientParams, lerpAmbientParams } from "./param-blend.js";
import { defaultParams } from "../music-schema.js";
import type { AmbientParams } from "../music-schema.js";

describe("param-blend", () => {
  it("cloneAmbientParams copies array fields", () => {
    const c = cloneAmbientParams(defaultParams);
    expect(c).not.toBe(defaultParams);
    expect(c.chordIntervals).not.toBe(defaultParams.chordIntervals);
    expect(c.colorPalette).not.toBe(defaultParams.colorPalette);
    expect(c.chordIntervals).toEqual(defaultParams.chordIntervals);
  });

  it("cloneAmbientParams deep copies regardless of array length", () => {
    const p: AmbientParams = {
      ...defaultParams,
      chordIntervals: [0],
      colorPalette: ["#ff0000"],
    };
    const c = cloneAmbientParams(p);
    expect(c).not.toBe(p);
    expect(c.chordIntervals).not.toBe(p.chordIntervals);
    expect(c.colorPalette).not.toBe(p.colorPalette);
    expect(c.chordIntervals).toEqual([0]);
    expect(c.colorPalette).toEqual(["#ff0000"]);
  });

  it("lerpAmbientParams interpolates scalars and snaps enums at completion", () => {
    const a = cloneAmbientParams({ ...defaultParams, baseFrequency: 100, oscillatorType: "sine", delayTime: "4n" });
    const b = cloneAmbientParams({ ...defaultParams, baseFrequency: 200, oscillatorType: "square", delayTime: "2n" });
    const mid = lerpAmbientParams(a, b, 0.5);
    expect(mid.baseFrequency).toBeCloseTo(150);
    expect(mid.oscillatorType).toBe("sine");
    expect(mid.delayTime).toBe("4n");

    const end = lerpAmbientParams(a, b, 1);
    expect(end.baseFrequency).toBe(200);
    expect(end.oscillatorType).toBe("square");
    expect(end.delayTime).toBe("2n");
  });

  it("lerpAmbientParams clamps t outside [0,1]", () => {
    const a = cloneAmbientParams({ ...defaultParams, baseFrequency: 100 });
    const b = cloneAmbientParams({ ...defaultParams, baseFrequency: 200 });
    const below = lerpAmbientParams(a, b, -0.5);
    expect(below.baseFrequency).toBe(100);
    const above = lerpAmbientParams(a, b, 2);
    expect(above.baseFrequency).toBe(200);
  });

  it("lerpAmbientParams handles differing chord interval lengths", () => {
    const a = cloneAmbientParams({ ...defaultParams, chordIntervals: [0, 4] });
    const b = cloneAmbientParams({ ...defaultParams, chordIntervals: [0, 3, 7] });
    const mid = lerpAmbientParams(a, b, 0.5);
    expect(mid.chordIntervals.length).toBe(3);
    const end = lerpAmbientParams(a, b, 1);
    expect(end.chordIntervals).toEqual([0, 3, 7]);
  });

  it("lerpAmbientParams handles differing palette lengths", () => {
    const a = cloneAmbientParams({ ...defaultParams, colorPalette: ["#ff0000"] });
    const b = cloneAmbientParams({ ...defaultParams, colorPalette: ["#00ff00", "#0000ff"] });
    const mid = lerpAmbientParams(a, b, 0.5);
    expect(mid.colorPalette.length).toBe(2);
    const end = lerpAmbientParams(a, b, 1);
    expect(end.colorPalette).toEqual(["#00ff00", "#0000ff"]);
  });
});
