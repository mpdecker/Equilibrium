import type { AmbientParams, EvolutionSettings } from "../music-schema.js";

/** Optional hints for engine-specific behaviour (Tone ramps, preview/worklet blending). */
export type ApplyParamsHint = {
  rampSeconds?: number;
};

/** Minimal analyser surface for UI visualisation */
export interface EngineAnalyserLike {
  getValue(): Float32Array | number[];
}

export interface IAmbientEngine {
  start(): Promise<void>;
  stop(): void;
  dispose(): void;
  applyParams(params: AmbientParams, hint?: ApplyParamsHint): void;
  applyEvolutionSettings(settings: EvolutionSettings): void;
  /** Duck-compatible with Tone.Analyser for visualisers */
  getAnalyser(): EngineAnalyserLike;
}
