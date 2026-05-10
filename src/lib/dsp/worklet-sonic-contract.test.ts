import { describe, it, expect } from "vitest";
import { WORKLET_DSP_SUPPORTED_KEYS } from "./worklet-sonic-contract.js";

describe("worklet sonic contract", () => {
  it("lists core DSP keys for the lightweight worklet path", () => {
    expect(WORKLET_DSP_SUPPORTED_KEYS).toContain("baseFrequency");
    expect(WORKLET_DSP_SUPPORTED_KEYS).toContain("filterCutoffMax");
  });
});
