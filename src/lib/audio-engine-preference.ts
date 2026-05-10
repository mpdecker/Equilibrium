import type { SynthesisEnginePreference } from "./music-schema.js";

/** Resolved mode used for `createAmbientEngine` (`preview` maps to PCM preview; `wasm` maps to AudioWorklet path). */
export type RuntimeSynthesisMode = "tone" | "preview" | "wasm";

export function resolveRuntimeSynthesisMode(
  preference: SynthesisEnginePreference,
  serverEffective: "tone" | "stub" | "wasm",
): RuntimeSynthesisMode {
  if (preference === "preview") return "preview";
  if (preference === "wasm") return "wasm";
  if (preference === "auto") {
    if (serverEffective === "stub") return "preview";
    if (serverEffective === "wasm") return "wasm";
    return "tone";
  }
  return "tone";
}

export function runtimeModeToEngineFlag(mode: RuntimeSynthesisMode): "tone" | "stub" | "wasm" {
  if (mode === "preview") return "stub";
  if (mode === "wasm") return "wasm";
  return "tone";
}
