/**
 * Preview PCM path aligned with `public/worklets/equilibrium-dsp-processor.js`.
 * Optional WASM: `/wasm/equilibrium_dsp.wasm` (`noiseAt`, `renderBlock`).
 * SYNC: Keep in lockstep when changing the AudioWorklet inner loop — run `vitest preview-worklet-parity`.
 */
import type { AmbientParams } from "../music-schema.js";

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Matches worklet deterministic noise `(sin((phase+i)*12.9898)*43758.5453)%1` semantics. */
export function deterministicWorkletNoise(phaseSamples: number, i: number): number {
  const x = Math.sin((phaseSamples + i) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Shared one-pole smoothing state for consecutive preview buffers (matches AudioWorklet lpZ). */
export type WorkletLpState = { z: number };

/**
 * Writes one stereo-identical mono frame of preview audio; returns updated phase in **samples**
 * (matching worklet `phase += frameLength * speed`).
 */
export function synthesizeWorkletPreviewInto(
  params: AmbientParams,
  evolutionSpeed01: number,
  phaseSamples: number,
  frameLength: number,
  sampleRate: number,
  outMono: Float32Array,
  lpState?: WorkletLpState,
): number {
  const n = frameLength;
  const sr = sampleRate;
  const intervals =
    params.chordIntervals.length > 0 ? params.chordIntervals : [0];
  const fund = Math.max(20, Number(params.baseFrequency) || 110);
  const complexity = clamp(Number(params.complexity), 0, 1);
  const harmonicity = clamp(Number(params.harmonicity), 0.1, 5);
  const noiseAmount = clamp(Number(params.noiseAmount), 0, 1);
  const lfoSpeed = clamp(Number(params.lfoSpeed), 0.01, 2);
  const chorusDepth = clamp(Number(params.chorusDepth), 0, 1);
  const delayFeedback = clamp(Number(params.delayFeedback), 0, 0.9);
  const filterCutoffMax = clamp(
    Number.isFinite(params.filterCutoffMax) ? params.filterCutoffMax : 800,
    200,
    5000,
  );

  const amp =
    0.14 *
    (0.35 + complexity * 0.65) *
    (0.85 + Math.min(harmonicity, 5) * 0.04);
  const speed = clamp(0.35 + evolutionSpeed01 * 1.15, 0.05, 4);

  let lp = lpState?.z ?? 0;
  /** One-pole smoothing toward cutoff (cheap brightness control; SYNC worklet). */
  const pole = Math.exp((-2 * Math.PI * filterCutoffMax) / sr);

  for (let i = 0; i < n; i++) {
    const t = (phaseSamples + i) / sr;
    let s = 0;
    let nVoices = 0;
    const maxChord = Math.min(6, intervals.length);
    for (let k = 0; k < maxChord; k++) {
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

    const lfoSlow =
      Math.sin(2 * Math.PI * Math.min(lfoSpeed, 2) * t) * 0.06 * chorusDepth;
    s *= 1 + lfoSlow;

    const noise =
      (deterministicWorkletNoise(phaseSamples, i) * 2 - 1) * noiseAmount * 0.22;
    let v = amp * s + noise;
    v *= 0.92 + delayFeedback * 0.08;
    v = clamp(v, -1, 1);

    lp = pole * lp + (1 - pole) * v;
    outMono[i] = lp;
  }

  if (lpState) lpState.z = lp;

  return phaseSamples + n * speed;
}

export function synthesizeWorkletPreviewBuffer(
  params: AmbientParams,
  evolutionSpeed01: number,
  phaseSamples: number,
  frameLength: number,
  sampleRate: number,
  lpState?: WorkletLpState,
): { buffer: Float32Array; phaseAfter: number } {
  const out = new Float32Array(frameLength);
  const phaseAfter = synthesizeWorkletPreviewInto(
    params,
    evolutionSpeed01,
    phaseSamples,
    frameLength,
    sampleRate,
    out,
    lpState,
  );
  return { buffer: out, phaseAfter };
}
