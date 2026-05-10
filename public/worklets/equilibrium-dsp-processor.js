/**
 * Lightweight AudioWorklet PCM preview.
 * SYNC with `src/lib/dsp/preview-worklet-match.ts` — keep DSP identical; run `vitest preview-worklet-parity`.
 * Optional WASM: `useWasmNoise` or `useWasmDsp` + `/wasm/equilibrium_dsp.wasm`.
 * DSP mode renders the preview-sized mono loop in WASM (`renderBlock`).
 */
const KNOWN_DSP_KEYS = new Set([
  "baseFrequency",
  "chordIntervals",
  "complexity",
  "harmonicity",
  "noiseAmount",
  "lfoSpeed",
  "chorusDepth",
  "delayFeedback",
  "filterCutoffMax",
]);

const PASSTHROUGH_KEYS = new Set(["colorPalette", "oscillatorType", "noiseType", "volume"]);

class EquilibriumDSPProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.evolutionSpeed = 0.5;
    /** @type {Record<string, unknown> | null} */
    this.params = null;
    this.lpZ = 0;
    /** @type {boolean} */
    this.wasmLoaded = false;
    /** @type {boolean} */
    this.wasmFailed = false;
    /** @type {boolean} */
    this.useWasmDsp = false;
    /** @type {boolean} */
    this.wasmDspFailed = false;
    /** @type {(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => number | null} */
    this.renderBlock = null;
    /** @type {WebAssembly.Memory | null} */
    this.wasmMemory = null;
    /** @type {(p: number, i: number) => number} */
    this.noiseFn = (p, i) => {
      const x = Math.sin((p + i) * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    this.port.onmessage = async (e) => {
      const d = e.data;
      if (d?.type !== "config") return;
      if (d.params && typeof d.params === "object") {
        for (const k of Object.keys(d.params)) {
          if (KNOWN_DSP_KEYS.has(k) || PASSTHROUGH_KEYS.has(k)) continue;
          /* optional metadata from envelope */
          if (k.startsWith("envelope") || k === "schemaVersion" || k === "sessionId") continue;
          this.port.postMessage({
            type: "workletContract",
            unknownParamKey: k,
          });
          break;
        }
        this.params = d.params;
      }
      if (typeof d.evolutionSpeed === "number") this.evolutionSpeed = d.evolutionSpeed;
      this.useWasmDsp = d.useWasmDsp === true;
      const wantWasm = d.useWasmNoise === true || this.useWasmDsp === true;
      if (
        wantWasm &&
        !this.wasmLoaded &&
        !this.wasmFailed &&
        typeof WebAssembly?.instantiateStreaming === "function"
      ) {
        try {
          const res = await fetch("/wasm/equilibrium_dsp.wasm");
          const inst = await WebAssembly.instantiateStreaming(res, {
            env: {
              sin: Math.sin,
              floor: Math.floor,
              pow: Math.pow,
            },
          });
          /** @type {any} */
          const ex = inst.instance.exports;
          if (typeof ex.noiseAt === "function") {
            this.wasmLoaded = true;
            this.noiseFn = (phase, i) => Number(ex.noiseAt(phase, i));
          }
          if (
            typeof ex.renderBlock === "function" &&
            ex.memory instanceof WebAssembly.Memory
          ) {
            this.renderBlock = ex.renderBlock.bind(ex);
            this.wasmMemory = ex.memory;
          }
        } catch (_err) {
          this.wasmFailed = true;
        }
      }
    };
  }

  process(inputs, outputs) {
    const outL = outputs[0][0];
    const outR = outputs[0][1];
    const n = outL.length;
    const sr = sampleRate;
    const p = this.params || DEFAULT_PARAMS;
    const intervals =
      Array.isArray(p.chordIntervals) && p.chordIntervals.length > 0 ? p.chordIntervals : [0];
    const fund = Math.max(20, Number(p.baseFrequency) || 110);
    const complexity = clamp(Number(p.complexity) ?? 0.5, 0, 1);
    const harmonicity = clamp(Number(p.harmonicity) ?? 2, 0.1, 5);
    const noiseAmount = clamp(Number(p.noiseAmount) ?? 0.1, 0, 1);
    const lfoSpeed = clamp(Number(p.lfoSpeed) ?? 0.1, 0.01, 2);
    const chorusDepth = clamp(Number(p.chorusDepth) ?? 0.5, 0, 1);
    const delayFeedback = clamp(Number(p.delayFeedback) ?? 0.4, 0, 0.9);
    const filterCutoffMax = clamp(Number(p.filterCutoffMax) ?? 800, 200, 5000);

    const amp =
      0.14 * (0.35 + complexity * 0.65) * (0.85 + Math.min(harmonicity, 5) * 0.04);
    const speed = clamp(0.35 + this.evolutionSpeed * 1.15, 0.05, 4);
    const pole = Math.exp((-2 * Math.PI * filterCutoffMax) / sr);
    const delayMix = 0.92 + delayFeedback * 0.08;
    const maxChord = Math.min(6, intervals.length);
    const maxH = Math.min(8, 2 + Math.floor(harmonicity));

    if (
      this.useWasmDsp === true &&
      this.renderBlock &&
      this.wasmMemory &&
      !this.wasmDspFailed &&
      this.wasmLoaded
    ) {
      try {
        const f64 = new Float64Array(this.wasmMemory.buffer);
        f64[0] = this.lpZ;
        for (let k = 0; k < 6; k++) {
          f64[8 + k] = k < intervals.length ? Number(intervals[k]) || 0 : 0;
        }
        const phaseAfter = this.renderBlock(
          this.phase,
          n,
          sr,
          speed,
          pole,
          amp,
          fund,
          noiseAmount,
          delayMix,
          lfoSpeed,
          chorusDepth,
          maxChord,
          maxH,
        );
        const outWasm = new Float64Array(this.wasmMemory.buffer, 2048, n);
        for (let i = 0; i < n; i++) {
          const s = outWasm[i];
          outL[i] = s;
          if (outR) outR[i] = s;
        }
        this.lpZ = f64[0];
        this.phase = phaseAfter;
        return true;
      } catch (_e) {
        this.wasmDspFailed = true;
      }
    }

    for (let i = 0; i < n; i++) {
      const t = (this.phase + i) / sr;
      let s = 0;
      let nVoices = 0;
      for (let k = 0; k < Math.min(6, intervals.length); k++) {
        const iv = Number(intervals[k]) || 0;
        const f = fund * Math.pow(2, iv / 12);
        s += Math.sin(2 * Math.PI * f * t);
        nVoices++;
      }
      if (nVoices > 0) s /= nVoices;

      const maxH = Math.min(8, 2 + Math.floor(harmonicity));
      for (let h = 2; h <= maxH; h++) {
        s += (0.11 / h) * Math.sin(2 * Math.PI * fund * h * t);
      }

      const lfoSlow = Math.sin(2 * Math.PI * Math.min(lfoSpeed, 2) * t) * 0.06 * chorusDepth;
      s *= 1 + lfoSlow;

      const noiseSample = this.noiseFn(this.phase, i);
      const noise = (noiseSample * 2 - 1) * noiseAmount * 0.22;
      let v = amp * s + noise;
      v *= delayMix;
      v = clamp(v, -1, 1);
      this.lpZ = pole * this.lpZ + (1 - pole) * v;
      outL[i] = this.lpZ;
      if (outR) outR[i] = this.lpZ;
    }

    this.phase += n * speed;
    return true;
  }
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

const DEFAULT_PARAMS = {
  baseFrequency: 110,
  chordIntervals: [0, 7, 12, 16],
  complexity: 0.3,
  harmonicity: 2,
  noiseAmount: 0.1,
  lfoSpeed: 0.1,
  chorusDepth: 0.5,
  delayFeedback: 0.4,
  filterCutoffMax: 800,
};

registerProcessor("equilibrium-dsp", EquilibriumDSPProcessor);
