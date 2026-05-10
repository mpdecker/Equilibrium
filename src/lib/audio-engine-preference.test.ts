import { describe, it, expect } from "vitest";
import {
  resolveRuntimeSynthesisMode,
  runtimeModeToEngineFlag,
} from "./audio-engine-preference.js";
import type { SynthesisEnginePreference } from "./music-schema.js";

describe("resolveRuntimeSynthesisMode", () => {
  it.each([
    ["tone", "tone", "tone"],
    ["tone", "stub", "tone"],
    ["tone", "wasm", "tone"],
    ["preview", "tone", "preview"],
    ["preview", "stub", "preview"],
    ["preview", "wasm", "preview"],
    ["wasm", "tone", "wasm"],
    ["wasm", "stub", "wasm"],
    ["wasm", "wasm", "wasm"],
    ["auto", "tone", "tone"],
    ["auto", "stub", "preview"],
    ["auto", "wasm", "wasm"],
  ] as const)("preference %s + effective %s -> %s", (pref, eff, expected) => {
    expect(resolveRuntimeSynthesisMode(pref as SynthesisEnginePreference, eff)).toBe(expected);
  });
});

describe("runtimeModeToEngineFlag", () => {
  it("maps preview/wasm/tone modes", () => {
    expect(runtimeModeToEngineFlag("preview")).toBe("stub");
    expect(runtimeModeToEngineFlag("wasm")).toBe("wasm");
    expect(runtimeModeToEngineFlag("tone")).toBe("tone");
  });
});
