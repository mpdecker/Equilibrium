import type { AmbientParams } from "../music-schema.js";

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  if (hex.length !== 7 || hex[0] !== "#") return null;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

function byteHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const u = clamp01(t);
  if (!pa || !pb) return u >= 1 ? b : a;
  return `#${byteHex(lerpNum(pa.r, pb.r, u))}${byteHex(lerpNum(pa.g, pb.g, u))}${byteHex(lerpNum(pa.b, pb.b, u))}`;
}

function lerpIntervals(a: number[], b: number[], t: number): number[] {
  const len = Math.max(a.length, b.length);
  const u = clamp01(t);
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    const va = a[Math.min(i, Math.max(0, a.length - 1))] ?? 0;
    const vb = b[Math.min(i, Math.max(0, b.length - 1))] ?? 0;
    out.push(lerpNum(va, vb, u));
  }
  return out;
}

export function cloneAmbientParams(p: AmbientParams): AmbientParams {
  return { ...p, chordIntervals: [...p.chordIntervals], colorPalette: [...p.colorPalette] };
}

/** Linear blend for stub/worklet preview paths; discrete enums snap only at completion (t ≥ 1). */
export function lerpAmbientParams(from: AmbientParams, to: AmbientParams, t: number): AmbientParams {
  const u = clamp01(t);
  const done = u >= 1;
  const paletteLen = Math.max(from.colorPalette.length, to.colorPalette.length);
  const palette: string[] = [];
  for (let i = 0; i < paletteLen; i++) {
    const ca = from.colorPalette[Math.min(i, Math.max(0, from.colorPalette.length - 1))] ?? "#000000";
    const cb = to.colorPalette[Math.min(i, Math.max(0, to.colorPalette.length - 1))] ?? "#000000";
    palette.push(lerpColor(ca, cb, u));
  }

  return {
    baseFrequency: lerpNum(from.baseFrequency, to.baseFrequency, u),
    chordIntervals: done ? [...to.chordIntervals] : lerpIntervals(from.chordIntervals, to.chordIntervals, u),
    filterCutoffMax: lerpNum(from.filterCutoffMax, to.filterCutoffMax, u),
    lfoSpeed: lerpNum(from.lfoSpeed, to.lfoSpeed, u),
    reverbWet: lerpNum(from.reverbWet, to.reverbWet, u),
    reverbDecay: lerpNum(from.reverbDecay, to.reverbDecay, u),
    volume: lerpNum(from.volume, to.volume, u),
    droneVolume: lerpNum(from.droneVolume, to.droneVolume, u),
    padVolume: lerpNum(from.padVolume, to.padVolume, u),
    arpVolume: lerpNum(from.arpVolume, to.arpVolume, u),
    bellVolume: lerpNum(from.bellVolume, to.bellVolume, u),
    subVolume: lerpNum(from.subVolume, to.subVolume, u),
    colorPalette: done ? [...to.colorPalette] : palette,
    oscillatorType: done ? to.oscillatorType : from.oscillatorType,
    harmonicity: lerpNum(from.harmonicity, to.harmonicity, u),
    modulationIndex: lerpNum(from.modulationIndex, to.modulationIndex, u),
    noiseAmount: lerpNum(from.noiseAmount, to.noiseAmount, u),
    noiseType: done ? to.noiseType : from.noiseType,
    delayTime: done ? to.delayTime : from.delayTime,
    delayFeedback: lerpNum(from.delayFeedback, to.delayFeedback, u),
    complexity: lerpNum(from.complexity, to.complexity, u),
    attackTime: lerpNum(from.attackTime, to.attackTime, u),
    releaseTime: lerpNum(from.releaseTime, to.releaseTime, u),
    chorusDepth: lerpNum(from.chorusDepth, to.chorusDepth, u),
    phaserFrequency: lerpNum(from.phaserFrequency, to.phaserFrequency, u),
  };
}
