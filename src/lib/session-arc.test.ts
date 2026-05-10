import { describe, it, expect } from "vitest";
import { defaultParams } from "./music-schema.js";
import { applySessionArcToParams, getSessionArcPhase } from "./session-arc.js";

describe("session arc", () => {
  it("labels arrive / hold / land", () => {
    expect(getSessionArcPhase(0.05)).toBe("arrive");
    expect(getSessionArcPhase(0.5)).toBe("hold");
    expect(getSessionArcPhase(0.95)).toBe("land");
  });

  it("ramps intro down then landing for sleep intent", () => {
    const early = applySessionArcToParams(defaultParams, "sleep", 0.05);
    const mid = applySessionArcToParams(defaultParams, "sleep", 0.5);
    expect(early.complexity).toBeLessThanOrEqual(defaultParams.complexity);
    expect(mid.complexity).toBeGreaterThanOrEqual(early.complexity);
  });
});
