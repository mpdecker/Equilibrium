import type { AmbientParams } from "./music-schema.js";

export type SessionIntent = "regulate" | "focus" | "sleep";

/** User-facing session phase for optional UI cues. */
export type SessionArcPhase = "arrive" | "hold" | "land";

const CURVES: Record<
  SessionIntent,
  { introEnd: number; tailStart: number; introFloor: number; tailDrop: number }
> = {
  regulate: { introEnd: 0.16, tailStart: 0.86, introFloor: 0.82, tailDrop: 0.14 },
  focus: { introEnd: 0.12, tailStart: 0.88, introFloor: 0.88, tailDrop: 0.09 },
  sleep: { introEnd: 0.22, tailStart: 0.79, introFloor: 0.72, tailDrop: 0.2 },
};

export function getSessionArcPhase(sessionProgress01: number): SessionArcPhase {
  const t = Math.max(0, Math.min(1, sessionProgress01));
  if (t < 0.18) return "arrive";
  if (t > 0.82) return "land";
  return "hold";
}

/**
 * Sonic arc over session progress: soft intro / stable hold / gentle landing.
 * `sessionProgress01` is elapsed / total duration (0–1).
 *
 * Tone path only: complements preview/worklet PCM (see `playback-macros`).
 */
export function applySessionArcToParams(
  base: AmbientParams,
  intent: SessionIntent,
  sessionProgress01: number,
): AmbientParams {
  const t = Math.max(0, Math.min(1, sessionProgress01));
  const c = CURVES[intent];

  let arc = 1;
  if (t < c.introEnd) {
    arc = c.introFloor + (t / c.introEnd) * (1 - c.introFloor);
  } else if (t > c.tailStart) {
    const u = (t - c.tailStart) / (1 - c.tailStart);
    arc = 1 - u * c.tailDrop;
  }

  let complexityMul = arc;
  let lfoMul = 1;
  let reverbMul = 1;

  if (intent === "focus") {
    complexityMul *= 1.06;
    lfoMul = 1.05;
    reverbMul = 0.96;
  } else if (intent === "sleep") {
    complexityMul *= 0.9;
    lfoMul = 0.92;
    reverbMul = 1.05;
  } else {
    reverbMul = 1.03;
  }

  return {
    ...base,
    complexity: Math.max(0, Math.min(1, base.complexity * complexityMul)),
    lfoSpeed: Math.max(0.01, Math.min(1, base.lfoSpeed * lfoMul * arc)),
    reverbWet: Math.max(0, Math.min(1, base.reverbWet * reverbMul)),
  };
}
