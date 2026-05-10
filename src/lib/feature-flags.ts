/** Server-side feature flags (also mirrored for client via `/api/audio-rollout`). */

export type ServerInstrumentMode = "stage" | "form" | "auto";

/** Resolved server hint for instrument UI; `auto` defers to the client. */
export function getServerInstrumentMode(): ServerInstrumentMode {
  const v = (process.env.INSTRUMENT_MODE ?? "auto").toLowerCase();
  if (v === "stage" || v === "form") return v;
  return "auto";
}

export function isAudioShadowModeEnabled(): boolean {
  const v = process.env.AUDIO_SHADOW_MODE;
  return v === "1" || v?.toLowerCase() === "true";
}

export function getServerAudioEnginePreference(): "tone" | "stub" | "wasm" | "auto" {
  const e = (process.env.AUDIO_ENGINE ?? "tone").toLowerCase();
  if (e === "stub") return "stub";
  if (e === "wasm") return "wasm";
  if (e === "auto") return "auto";
  return "tone";
}

/** Effective engine used for rollout hints (`auto` prefers wasm when enabled, else tone). */
export function resolveEffectiveServerEngine(): "tone" | "stub" | "wasm" {
  const p = getServerAudioEnginePreference();
  if (p === "stub") return "stub";
  if (p === "wasm") return "wasm";
  if (p === "auto") {
    const wasmFirst = (process.env.AUDIO_ENGINE_AUTO_WASM ?? "1").toLowerCase();
    const preferWasm = wasmFirst === "1" || wasmFirst === "true";
    return preferWasm ? "wasm" : "tone";
  }
  return "tone";
}
