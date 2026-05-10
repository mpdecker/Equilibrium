/**
 * Codified motion constants for the instrument UI.
 *
 * Why: spring/easing values were previously inlined in dozens of `motion/react`
 * call sites (`whileHover={{ scale: 1.04 }}`, `transition={{ type: "spring", stiffness: 400, damping: 32 }}`),
 * making it impossible to tune the "feel" of the instrument coherently.
 *
 * Conventions:
 * - `instrument.*`  — the dominant motion grammar for stage gestures (high stiffness, low overshoot).
 * - `surface.*`     — secondary surfaces (drawers, sheets, modals) — slower, calmer.
 * - `accent.*`      — micro-interactions on accent controls (play button, palette dots).
 * - `reduced`       — drop-in replacements when `prefers-reduced-motion: reduce` is set.
 */

export type SpringTransition = {
  type: "spring";
  stiffness: number;
  damping: number;
  mass?: number;
};

export type TweenTransition = {
  type?: "tween";
  duration: number;
  ease?: number[] | string;
};

export type Transition = SpringTransition | TweenTransition;

export const MOTION = {
  instrument: {
    /** Cursor-following micro-feedback (HUD reveal, reticle). */
    follow: { type: "spring", stiffness: 520, damping: 38, mass: 0.6 } as SpringTransition,
    /** Drag-driven param visualization on the stage. */
    drag: { type: "spring", stiffness: 380, damping: 32 } as SpringTransition,
    /** Release-ramp animation for the visualizer "settling" after a gesture ends. */
    settle: { duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] } as TweenTransition,
  },
  surface: {
    /** Drawer / sheet open + close. */
    drawer: { type: "spring", stiffness: 320, damping: 36 } as SpringTransition,
    /** Modal scale-in. */
    modal: { type: "spring", stiffness: 280, damping: 30 } as SpringTransition,
    /** First-run / hint fades. */
    hint: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } as TweenTransition,
    /** Disclosure expand/collapse inside sheets (Audio Lab expert). */
    collapse: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } as TweenTransition,
  },
  accent: {
    /** Hover scale on pills/buttons (consolidates `whileHover={{ scale: 1.04 }}`). */
    hover: { type: "spring", stiffness: 420, damping: 28 } as SpringTransition,
    /** Tap scale (consolidates `whileTap={{ scale: 0.96 }}`). */
    tap: { type: "spring", stiffness: 600, damping: 32 } as SpringTransition,
  },
  reduced: {
    instant: { duration: 0 } as TweenTransition,
  },
} as const;

export const SCALE = {
  hover: 1.04,
  hoverSubtle: 1.02,
  tap: 0.96,
  tapSubtle: 0.98,
} as const;

/**
 * Resolve a transition that respects reduced-motion. Pass the reduced-motion
 * flag from `useReducedMotion()` so we don't read `matchMedia` twice per render.
 */
export function withReducedMotion<T extends Transition>(
  transition: T,
  prefersReducedMotion: boolean,
): T | TweenTransition {
  return prefersReducedMotion ? MOTION.reduced.instant : transition;
}
