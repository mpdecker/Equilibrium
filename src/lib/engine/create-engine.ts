import type { IAmbientEngine } from "./types.js";
import type { AmbientEngineOptions } from "../synth.js";
import { ToneAmbientEngineAdapter } from "./tone-ambient-engine.js";
import { PreviewAmbientEngine } from "./stub-engine.js";
import { WorkletAmbientEngine } from "./worklet-ambient-engine.js";

export type CreateAmbientEngineOptions = AmbientEngineOptions & {
  /** Overrides `import.meta.env.VITE_AUDIO_ENGINE` (primarily for tests). `preview` is an alias for stub/preview PCM path. */
  engineMode?: "tone" | "stub" | "preview" | "wasm";
};

function resolveClientEngineMode(): "tone" | "stub" | "wasm" {
  try {
    const v = import.meta.env?.VITE_AUDIO_ENGINE as string | undefined;
    if (v === "stub") return "stub";
    if (v === "wasm") return "wasm";
  } catch {
    /* vitest / node */
  }
  return "tone";
}

export function createAmbientEngine(opts?: CreateAmbientEngineOptions): IAmbientEngine {
  const { engineMode, ...rest } = opts ?? {};
  const raw = engineMode ?? resolveClientEngineMode();
  const mode = raw === "preview" ? "stub" : raw;
  if (mode === "stub") {
    return new PreviewAmbientEngine({ rng: rest.rng });
  }
  if (mode === "wasm") {
    return new WorkletAmbientEngine();
  }
  return new ToneAmbientEngineAdapter(rest);
}
