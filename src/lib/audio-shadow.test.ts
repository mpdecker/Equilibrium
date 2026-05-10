import { describe, it, expect } from "vitest";
import { computeShadowComparison } from "./audio-shadow.js";
import { defaultParams } from "./music-schema.js";

describe("audio shadow comparison", () => {
  it("marks PCM reference/target synthesis fingerprints within tolerance", () => {
    const result = computeShadowComparison(defaultParams);
    expect(result.withinTolerance).toBe(true);
  });
});
