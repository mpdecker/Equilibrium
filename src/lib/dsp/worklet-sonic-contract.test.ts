import { describe, it, expect } from "vitest";
import {
  WORKLET_DSP_SUPPORTED_KEYS,
  WORKLET_DSP_NON_DSP_KEYS_SENT,
} from "./worklet-sonic-contract.js";

describe("worklet sonic contract", () => {
  it("lists core DSP keys for the lightweight worklet path", () => {
    expect(WORKLET_DSP_SUPPORTED_KEYS).toContain("baseFrequency");
    expect(WORKLET_DSP_SUPPORTED_KEYS).toContain("filterCutoffMax");
  });

  it("includes all expected DSP keys", () => {
    const expected = [
      "baseFrequency",
      "chordIntervals",
      "complexity",
      "harmonicity",
      "noiseAmount",
      "lfoSpeed",
      "chorusDepth",
      "delayFeedback",
      "filterCutoffMax",
    ];
    expect(WORKLET_DSP_SUPPORTED_KEYS).toEqual(expected);
  });

  it("non-DSP keys include palette and timbre enums", () => {
    expect(WORKLET_DSP_NON_DSP_KEYS_SENT).toContain("colorPalette");
    expect(WORKLET_DSP_NON_DSP_KEYS_SENT).toContain("oscillatorType");
    expect(WORKLET_DSP_NON_DSP_KEYS_SENT).toContain("noiseType");
    expect(WORKLET_DSP_NON_DSP_KEYS_SENT.length).toBe(3);
  });
});
