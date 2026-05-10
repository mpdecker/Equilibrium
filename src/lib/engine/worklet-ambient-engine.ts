import type { AmbientParams, EvolutionSettings } from "../music-schema.js";
import { defaultParams, defaultSettings } from "../music-schema.js";
import { cloneAmbientParams, lerpAmbientParams } from "./param-blend.js";
import { PreviewAmbientEngine } from "./stub-engine.js";
import type { ApplyParamsHint, EngineAnalyserLike, IAmbientEngine } from "./types.js";

const DEFAULT_WORKLET_URL = "/worklets/equilibrium-dsp-processor.js";

class SilentAnalyser implements EngineAnalyserLike {
  private readonly buf = new Float32Array(256);
  getValue(): Float32Array {
    this.buf.fill(0);
    return this.buf;
  }
}

class FloatAnalyserWrap implements EngineAnalyserLike {
  private readonly buf: Float32Array;
  constructor(private readonly node: AnalyserNode) {
    this.buf = new Float32Array(node.fftSize);
  }
  getValue(): Float32Array {
    this.node.getFloatTimeDomainData(this.buf);
    return this.buf;
  }
}

function cloneParamsForWorklet(p: AmbientParams): Record<string, unknown> {
  return { ...p, chordIntervals: [...p.chordIntervals], colorPalette: [...p.colorPalette] };
}

/**
 * AudioWorklet playback path; optional WASM (`VITE_PREVIEW_WASM_NOISE` / `VITE_PREVIEW_WASM_DSP`).
 * Falls back to {@link PreviewAmbientEngine} when worklets are unavailable (tests, older browsers).
 */
export class WorkletAmbientEngine implements IAmbientEngine {
  private params: AmbientParams = cloneAmbientParams(defaultParams);
  private evolutionSettings: EvolutionSettings = { ...defaultSettings };
  private paramBlendInterval: ReturnType<typeof setInterval> | null = null;
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private playing = false;
  private fallback: PreviewAmbientEngine | null = null;
  private analyserBridge: EngineAnalyserLike = new SilentAnalyser();
  private readonly workletModuleUrl: string;

  constructor(opts?: { workletModuleUrl?: string }) {
    this.workletModuleUrl = opts?.workletModuleUrl ?? DEFAULT_WORKLET_URL;
  }

  getAnalyser(): EngineAnalyserLike {
    return this.analyserBridge;
  }

  async start(): Promise<void> {
    if (this.fallback) {
      await this.fallback.start();
      this.analyserBridge = this.fallback.getAnalyser();
      this.playing = true;
      return;
    }
    if (this.playing && this.ctx?.state === "running") return;

    try {
      const AC =
        globalThis.AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) throw new Error("AudioContext unavailable");

      this.teardownWorklet();
      this.ctx = new AC();
      await this.ctx.audioWorklet.addModule(this.workletModuleUrl);
      this.node = new AudioWorkletNode(this.ctx, "equilibrium-dsp", {
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.45;

      this.node.connect(this.analyserNode);
      this.analyserNode.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.postConfig();
      this.analyserBridge = new FloatAnalyserWrap(this.analyserNode);
      await this.ctx.resume();
      this.playing = true;
    } catch {
      this.teardownWorklet();
      this.fallback = new PreviewAmbientEngine();
      this.fallback.applyParams(this.params);
      this.fallback.applyEvolutionSettings(this.evolutionSettings);
      await this.fallback.start();
      this.analyserBridge = this.fallback.getAnalyser();
      this.playing = true;
    }
  }

  stop(): void {
    this.playing = false;
    this.clearParamBlend();
    this.fallback?.stop();
    void this.ctx?.suspend();
    this.analyserBridge = new SilentAnalyser();
  }

  dispose(): void {
    this.playing = false;
    this.clearParamBlend();
    this.fallback?.dispose();
    this.fallback = null;
    this.teardownWorklet();
    this.analyserBridge = new SilentAnalyser();
  }

  applyParams(params: AmbientParams, hint?: ApplyParamsHint): void {
    const target = cloneAmbientParams(params);
    this.clearParamBlend();

    if (this.fallback) {
      this.params = target;
      this.fallback.applyParams(params, hint);
      return;
    }

    const ramp = hint?.rampSeconds;
    if (ramp && ramp >= 3 && this.node) {
      const from = cloneAmbientParams(this.params);
      const steps = Math.max(16, Math.min(56, Math.floor(ramp * 4)));
      const stepMs = Math.max(45, (ramp * 1000) / steps);
      let step = 0;
      this.paramBlendInterval = globalThis.setInterval(() => {
        step++;
        const u = Math.min(1, step / steps);
        const eased = u * u * (3 - 2 * u);
        this.params = lerpAmbientParams(from, target, eased);
        this.postConfig();
        if (step >= steps) {
          this.params = target;
          this.postConfig();
          this.clearParamBlend();
        }
      }, stepMs);
      return;
    }

    this.params = target;
    this.postConfig();
  }

  applyEvolutionSettings(settings: EvolutionSettings): void {
    this.evolutionSettings = settings;
    this.fallback?.applyEvolutionSettings(settings);
    this.postConfig();
  }

  private postConfig(): void {
    const wasmNoise = import.meta.env?.VITE_PREVIEW_WASM_NOISE === "true";
    const wasmDsp = import.meta.env?.VITE_PREVIEW_WASM_DSP === "true";
    this.node?.port.postMessage({
      type: "config",
      params: cloneParamsForWorklet(this.params),
      evolutionSpeed: this.evolutionSettings.evolutionSpeed,
      /** Noise-only WASM still loads the unified module (`noiseAt`); DSP mode renders full blocks via `renderBlock`. */
      useWasmNoise: wasmNoise && !wasmDsp,
      useWasmDsp: wasmDsp,
    });
  }

  private clearParamBlend(): void {
    if (this.paramBlendInterval) {
      globalThis.clearInterval(this.paramBlendInterval);
      this.paramBlendInterval = null;
    }
  }

  private teardownWorklet(): void {
    this.clearParamBlend();
    try {
      this.node?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.analyserNode?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.gain?.disconnect();
    } catch {
      /* ignore */
    }
    this.node = null;
    this.analyserNode = null;
    this.gain = null;
    try {
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }
}
