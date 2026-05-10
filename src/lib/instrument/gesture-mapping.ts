/**
 * Pure mapping from raw stage gestures to engine macro deltas.
 *
 * The macros (`intensity`, `brightness`) are the dominant interaction surface
 * for instrument mode. Other gestures (long-press, two-finger rotate) emit
 * `paletteHint` rotations that the caller resolves against the palette list.
 *
 * Kept entirely pure so it is trivially unit-testable.
 */

export type StageAxes = {
  /** Normalized X position on the stage, 0 (left) → 1 (right). */
  x: number;
  /** Normalized Y position on the stage, 0 (top) → 1 (bottom). */
  y: number;
};

export type GestureSnapshot = {
  /** Active pointer position normalized to 0..1, or null if no pointer is over the stage. */
  axes: StageAxes | null;
  /** Long-press is engaged. */
  hold: boolean;
  /** Optional rotation accumulator from two-finger gesture, in radians. */
  rotation?: number;
  /** Pinch scale factor, 1 = no change. */
  pinch?: number;
};

export type MacroState = {
  /** 0..1 — motion / modulation depth. */
  intensity: number;
  /** 0..1 — tone / harmonic openness. */
  brightness: number;
};

export type MacroDelta = Partial<MacroState> & {
  /** Integer hint to advance/regress through the palette list (e.g. -1, +1). */
  paletteHintIndex?: number;
};

export type MapGestureOptions = {
  /** How sensitive horizontal drag is (default 1.0). */
  intensitySensitivity?: number;
  /** How sensitive vertical drag is (default 1.0). */
  brightnessSensitivity?: number;
  /** Radians per palette advance for two-finger rotation (default π/4). */
  rotationStep?: number;
  /** Pinch scale increment per palette advance (default 0.18). */
  pinchStep?: number;
};

const DEFAULTS: Required<MapGestureOptions> = {
  intensitySensitivity: 1.0,
  brightnessSensitivity: 1.0,
  rotationStep: Math.PI / 4,
  pinchStep: 0.18,
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Map an absolute gesture snapshot onto target macro values.
 *
 * Rules:
 * - X axis is intensity (0 = left, 1 = right).
 * - Y axis is brightness (0 = bottom, 1 = top — visually "up = brighter").
 * - When `axes` is null (pointer left stage), no macro target is emitted.
 */
export function mapGestureToMacros(
  gesture: GestureSnapshot,
  prevMacros: MacroState,
  options: MapGestureOptions = {},
): MacroDelta {
  const opts = { ...DEFAULTS, ...options };
  const delta: MacroDelta = {};

  if (gesture.axes) {
    const targetIntensity = clamp01(
      lerp(prevMacros.intensity, gesture.axes.x, opts.intensitySensitivity),
    );
    const targetBrightness = clamp01(
      lerp(prevMacros.brightness, 1 - gesture.axes.y, opts.brightnessSensitivity),
    );
    delta.intensity = targetIntensity;
    delta.brightness = targetBrightness;
  }

  if (gesture.rotation !== undefined && gesture.rotation !== 0) {
    const steps = Math.trunc(gesture.rotation / opts.rotationStep);
    if (steps !== 0) delta.paletteHintIndex = steps;
  }

  if (gesture.pinch !== undefined && gesture.pinch !== 1) {
    const steps = Math.trunc((gesture.pinch - 1) / opts.pinchStep);
    if (steps !== 0) {
      delta.paletteHintIndex = (delta.paletteHintIndex ?? 0) + steps;
    }
  }

  return delta;
}

/**
 * Map a relative drag delta (e.g. arrow-key nudge) onto a macro state.
 * Used by the a11y keyboard path.
 */
export function nudgeMacros(
  prev: MacroState,
  intensityDelta: number,
  brightnessDelta: number,
): MacroState {
  return {
    intensity: clamp01(prev.intensity + intensityDelta),
    brightness: clamp01(prev.brightness + brightnessDelta),
  };
}

function lerp(prev: number, target: number, sensitivity: number): number {
  if (sensitivity >= 1) return target;
  if (sensitivity <= 0) return prev;
  return prev + (target - prev) * sensitivity;
}
