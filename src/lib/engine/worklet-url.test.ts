import { describe, it, expect } from "vitest";
import { resolveWorkletModuleUrl } from "./worklet-url.js";

describe("resolveWorkletModuleUrl", () => {
  it("uses absolute root when BASE_URL is / (dev / same-origin web)", () => {
    expect(resolveWorkletModuleUrl("/")).toBe("/worklets/equilibrium-dsp-processor.js");
  });

  it("uses relative path when BASE_URL is ./ (Capacitor / production vite base)", () => {
    expect(resolveWorkletModuleUrl("./")).toBe("./worklets/equilibrium-dsp-processor.js");
  });

  it("normalizes missing trailing slash", () => {
    expect(resolveWorkletModuleUrl(".")).toBe("./worklets/equilibrium-dsp-processor.js");
  });
});
