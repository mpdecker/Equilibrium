import * as Tone from "tone";
import { AmbientEngine, type AmbientEngineOptions } from "../synth.js";
import type { AmbientParams, EvolutionSettings } from "../music-schema.js";
import type { ApplyParamsHint, EngineAnalyserLike, IAmbientEngine } from "./types.js";

class ToneAnalyserWrap implements EngineAnalyserLike {
  constructor(private inner: Tone.Analyser) {}
  getValue(): Float32Array {
    return this.inner.getValue() as Float32Array;
  }
}

export class ToneAmbientEngineAdapter implements IAmbientEngine {
  private readonly engine: AmbientEngine;

  constructor(opts?: AmbientEngineOptions) {
    this.engine = new AmbientEngine(opts);
  }

  async start(): Promise<void> {
    return this.engine.start();
  }

  stop(): void {
    this.engine.stop();
  }

  dispose(): void {
    this.engine.dispose();
  }

  applyParams(params: AmbientParams, hint?: ApplyParamsHint): void {
    this.engine.applyParams(params, hint);
  }

  applyEvolutionSettings(settings: EvolutionSettings): void {
    this.engine.applyEvolutionSettings(settings);
  }

  getAnalyser(): EngineAnalyserLike {
    return new ToneAnalyserWrap(this.engine.analyser);
  }
}
