import type { AmbientParams, EvolutionSettings } from "../music-schema.js";
import { defaultParams, defaultSettings } from "../music-schema.js";
import { synthesizeWorkletPreviewInto, type WorkletLpState } from "../dsp/preview-worklet-match.js";
import { cloneAmbientParams, lerpAmbientParams } from "./param-blend.js";
import type { ApplyParamsHint, EngineAnalyserLike, IAmbientEngine } from "./types.js";
export type StubEngineOptions = {
  /** @deprecated Preview path uses deterministic worklet-style noise; ignored. */
  rng?: () => number;
};

/**
 * Browser-safe preview engine: generates PCM from params without Tone / Web Audio graph.
 * Matches the AudioWorklet lightweight path (`preview-worklet-match`); shadow fingerprints use
 * {@link synthesizeStubAudioBuffer} harmonic stretch variants instead.
 */
export class PreviewAmbientEngine implements IAmbientEngine {
  private params: AmbientParams = cloneAmbientParams(defaultParams);
  /** Params currently driving PCM (may lag `params` during crossfade). */
  private audibleParams: AmbientParams = cloneAmbientParams(defaultParams);
  private blendFrom: AmbientParams = cloneAmbientParams(defaultParams);
  private blendTo: AmbientParams = cloneAmbientParams(defaultParams);
  private blendStartMs = 0;
  private blendDurationMs = 0;
  private evolutionSettings: EvolutionSettings = { ...defaultSettings };
  private phase = 0;
  private playing = false;
  private readonly sampleRate = 48000;
  private readonly frame = new Float32Array(256);
  /** One-pole LP state aligned with AudioWorklet `lpZ` across successive frames. */
  private readonly lpState: WorkletLpState = { z: 0 };

  constructor(_options?: StubEngineOptions) {}

  async start(): Promise<void> {
    this.playing = true;
  }

  stop(): void {
    this.playing = false;
  }

  dispose(): void {
    this.playing = false;
    this.phase = 0;
    this.lpState.z = 0;
    this.blendDurationMs = 0;
  }

  applyParams(params: AmbientParams, hint?: ApplyParamsHint): void {
    const next = cloneAmbientParams(params);
    this.params = next;
    const ramp = hint?.rampSeconds ?? 0;
    if (ramp >= 2 && this.playing) {
      this.blendFrom = cloneAmbientParams(this.resolveAudibleParamsNow());
      this.blendTo = next;
      this.blendStartMs =
        typeof globalThis.performance !== "undefined" ? globalThis.performance.now() : Date.now();
      this.blendDurationMs = ramp * 1000;
    } else {
      this.blendDurationMs = 0;
      this.audibleParams = next;
    }
  }

  /** Instant audible state without advancing time (for blend start snapshots). */
  private resolveAudibleParamsNow(): AmbientParams {
    if (this.blendDurationMs <= 0) return this.audibleParams;
    const now =
      typeof globalThis.performance !== "undefined" ? globalThis.performance.now() : Date.now();
    const t = (now - this.blendStartMs) / this.blendDurationMs;
    if (t >= 1) {
      this.audibleParams = cloneAmbientParams(this.blendTo);
      this.blendDurationMs = 0;
      return this.audibleParams;
    }
    return lerpAmbientParams(this.blendFrom, this.blendTo, t);
  }

  private consumeAudibleParamsForFrame(): AmbientParams {
    if (this.blendDurationMs <= 0) return this.audibleParams;
    const now =
      typeof globalThis.performance !== "undefined" ? globalThis.performance.now() : Date.now();
    let t = (now - this.blendStartMs) / this.blendDurationMs;
    if (t >= 1) {
      this.audibleParams = cloneAmbientParams(this.blendTo);
      this.blendDurationMs = 0;
      return this.audibleParams;
    }
    // Smoothstep ease — stub path only
    t = t * t * (3 - 2 * t);
    return lerpAmbientParams(this.blendFrom, this.blendTo, t);
  }

  applyEvolutionSettings(settings: EvolutionSettings): void {
    this.evolutionSettings = settings;
  }

  getAnalyser(): EngineAnalyserLike {
    return {
      getValue: () => this.captureFrame(),
    };
  }

  /** Phase accumulator for tests */
  getPhase(): number {
    return this.phase;
  }

  private captureFrame(): Float32Array {
    if (!this.playing) {
      this.frame.fill(0);
      return this.frame;
    }
    this.phase = synthesizeWorkletPreviewInto(
      this.consumeAudibleParamsForFrame(),
      this.evolutionSettings.evolutionSpeed,
      this.phase,
      this.frame.length,
      this.sampleRate,
      this.frame,
      this.lpState,
    );
    return this.frame;
  }
}

/** @deprecated Use `PreviewAmbientEngine` — same constructor at runtime */
export const StubAmbientEngine = PreviewAmbientEngine;
