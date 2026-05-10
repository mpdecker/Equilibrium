import { describe, it, expect } from "vitest";
import { cloneAmbientParams, lerpAmbientParams } from "./param-blend.js";
import { defaultParams } from "../music-schema.js";

describe("param-blend", () => {
  it("cloneAmbientParams copies array fields", () => {
    const c = cloneAmbientParams(defaultParams);
    expect(c).not.toBe(defaultParams);
    expect(c.chordIntervals).not.toBe(defaultParams.chordIntervals);
    expect(c.colorPalette).not.toBe(defaultParams.colorPalette);
    expect(c.chordIntervals).toEqual(defaultParams.chordIntervals);
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
});
