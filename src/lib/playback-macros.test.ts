import { describe, it, expect } from "vitest";
import { defaultParams } from "./music-schema.js";
import { applyPlaybackBrightnessMacro, applyPlaybackIntensityMacro } from "./playback-macros.js";

describe("playback macros", () => {
  it("intensity adjusts motion fields without touching filter ceiling", () => {
    const base = { ...defaultParams, filterCutoffMax: 1200 };
    const out = applyPlaybackIntensityMacro(base, 0.5);
    expect(out.filterCutoffMax).toBe(1200);
    expect(out.complexity).not.toBe(base.complexity);
  });

  it("brightness increases filter cutoff relative to dimmer settings", () => {
    const base = { ...defaultParams, filterCutoffMax: 850, harmonicity: 2, reverbWet: 0.5 };
    const dim = applyPlaybackBrightnessMacro(base, 0.4);
    const bright = applyPlaybackBrightnessMacro(base, 1);
    expect(bright.filterCutoffMax).toBeGreaterThan(dim.filterCutoffMax);
    expect(bright.harmonicity).toBeGreaterThanOrEqual(dim.harmonicity);
    expect(bright.reverbWet).toBeGreaterThanOrEqual(dim.reverbWet);
  });
});
