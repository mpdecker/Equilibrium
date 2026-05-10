import type { SynthesisEnginePreference } from "../synth";

export const STORED_SYNTH_KEY = "equilibrium.synthesisEngine";

export function readStoredSynthesisPreference(): SynthesisEnginePreference | undefined {
  try {
    const v = localStorage.getItem(STORED_SYNTH_KEY);
    if (v === "tone" || v === "preview" || v === "wasm" || v === "auto") return v;
  } catch {
    /* private mode */
  }
  return undefined;
}
