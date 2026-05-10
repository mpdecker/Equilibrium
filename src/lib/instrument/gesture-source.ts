import { useEffect, useRef, useState, type RefObject } from "react";
import type { GestureSnapshot, StageAxes } from "./gesture-mapping";

/**
 * Hook that turns a DOM target into a pointer/touch gesture source.
 *
 * Emits a single rolling `GestureSnapshot` via `onGesture`. Cheap to call:
 * we throttle nothing here — coalescing is the param-commit layer's job.
 *
 * Multi-touch arbitration:
 *  - 1 active pointer  → axes mode (drag)
 *  - 2 active pointers → rotation + pinch (no axes)
 *  - 3+ pointers       → ignored (browser may handle as zoom)
 *
 * Long-press is detected after `holdMs` of stationary single-pointer activity
 * (movement <= `holdJitterPx`).
 *
 * Pointer is captured on `pointerdown` to keep tracking across the whole window.
 */

export type GestureSourceOptions = {
  /** Element that defines the gesture coordinate space (the stage capture layer). */
  targetRef: RefObject<HTMLElement | null>;
  /** Called on every pointer move / multi-touch change. Should be cheap. */
  onGesture: (snapshot: GestureSnapshot) => void;
  /** Called when pointer leaves the stage entirely. */
  onLeave?: () => void;
  /** Called once when long-press fires (cursor went still for `holdMs`). */
  onLongPress?: (axes: StageAxes) => void;
  /** Called when a tap completes (down + up within `tapMs`, no move). */
  onTap?: (axes: StageAxes) => void;
  /** ms threshold for long-press. Default 500. */
  holdMs?: number;
  /** Max movement in pixels to still count as long-press / tap. Default 6. */
  holdJitterPx?: number;
  /** Max ms for tap. Default 220. */
  tapMs?: number;
  /** Disable the listener entirely (e.g. when the drawer is open). */
  disabled?: boolean;
};

type ActivePointer = {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  startedAt: number;
};

const DEFAULTS = {
  holdMs: 500,
  holdJitterPx: 6,
  tapMs: 220,
};

export function useStageGesture(opts: GestureSourceOptions): void {
  const {
    targetRef,
    onGesture,
    onLeave,
    onLongPress,
    onTap,
    holdMs = DEFAULTS.holdMs,
    holdJitterPx = DEFAULTS.holdJitterPx,
    tapMs = DEFAULTS.tapMs,
    disabled = false,
  } = opts;

  const stateRef = useRef<{
    pointers: Map<number, ActivePointer>;
    holdTimer: number | null;
    longPressed: boolean;
    initialDistance: number | null;
    initialAngle: number | null;
  }>({
    pointers: new Map(),
    holdTimer: null,
    longPressed: false,
    initialDistance: null,
    initialAngle: null,
  });

  useEffect(() => {
    if (disabled) return;
    const target = targetRef.current;
    if (!target) return;

    const cancelHoldTimer = () => {
      const s = stateRef.current;
      if (s.holdTimer !== null) {
        window.clearTimeout(s.holdTimer);
        s.holdTimer = null;
      }
    };

    const startHoldTimer = (axes: StageAxes) => {
      const s = stateRef.current;
      cancelHoldTimer();
      s.holdTimer = window.setTimeout(() => {
        s.longPressed = true;
        if (onLongPress) onLongPress(axes);
        emit();
      }, holdMs);
    };

    const computeAxes = (clientX: number, clientY: number): StageAxes => {
      const rect = target.getBoundingClientRect();
      const x = (clientX - rect.left) / Math.max(1, rect.width);
      const y = (clientY - rect.top) / Math.max(1, rect.height);
      return { x: clamp01(x), y: clamp01(y) };
    };

    const emit = () => {
      const s = stateRef.current;
      const ps: ActivePointer[] = Array.from(s.pointers.values());

      if (ps.length === 0) {
        onGesture({ axes: null, hold: false });
        return;
      }

      if (ps.length === 1) {
        const p = ps[0];
        onGesture({
          axes: computeAxes(p.x, p.y),
          hold: s.longPressed,
        });
        return;
      }

      // Two pointers — emit rotation + pinch only (no single-axis drag).
      const a = ps[0];
      const b = ps[1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      if (s.initialDistance === null) {
        s.initialDistance = distance;
        s.initialAngle = angle;
      }

      const rotation = s.initialAngle === null ? 0 : normalizeAngle(angle - s.initialAngle);
      const pinch = s.initialDistance > 0 ? distance / s.initialDistance : 1;

      onGesture({
        axes: null,
        hold: false,
        rotation,
        pinch,
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      const s = stateRef.current;
      if (s.pointers.size >= 2) return;

      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* element may not be capturable in tests */
      }

      s.pointers.set(e.pointerId, {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        startedAt: Date.now(),
      });

      if (s.pointers.size === 1) {
        s.longPressed = false;
        startHoldTimer(computeAxes(e.clientX, e.clientY));
      } else {
        cancelHoldTimer();
        s.initialDistance = null;
        s.initialAngle = null;
      }
      emit();
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = stateRef.current;
      const p = s.pointers.get(e.pointerId);
      if (!p) {
        // Hover-only (no button) — emit single-axis position.
        if (s.pointers.size === 0) {
          onGesture({ axes: computeAxes(e.clientX, e.clientY), hold: false });
        }
        return;
      }
      p.x = e.clientX;
      p.y = e.clientY;

      // Cancel hold timer if movement exceeds jitter threshold.
      const moved = Math.hypot(p.x - p.startX, p.y - p.startY);
      if (moved > holdJitterPx) {
        cancelHoldTimer();
      }
      emit();
    };

    const onPointerUp = (e: PointerEvent) => {
      const s = stateRef.current;
      const p = s.pointers.get(e.pointerId);
      if (!p) return;

      const moved = Math.hypot(p.x - p.startX, p.y - p.startY);
      const elapsed = Date.now() - p.startedAt;
      const isTap = !s.longPressed && moved <= holdJitterPx && elapsed <= tapMs;

      s.pointers.delete(e.pointerId);
      cancelHoldTimer();

      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (s.pointers.size < 2) {
        s.initialDistance = null;
        s.initialAngle = null;
      }

      if (isTap && onTap) {
        onTap(computeAxes(p.x, p.y));
      }

      if (s.pointers.size === 0) {
        s.longPressed = false;
      }
      emit();
    };

    const onPointerCancel = (e: PointerEvent) => {
      const s = stateRef.current;
      s.pointers.delete(e.pointerId);
      cancelHoldTimer();
      if (s.pointers.size < 2) {
        s.initialDistance = null;
        s.initialAngle = null;
      }
      if (s.pointers.size === 0) {
        s.longPressed = false;
        if (onLeave) onLeave();
      }
      emit();
    };

    const onPointerLeave = (e: PointerEvent) => {
      // Only treat as "left stage" if no buttons are held.
      if (e.buttons === 0 && stateRef.current.pointers.size === 0) {
        if (onLeave) onLeave();
        onGesture({ axes: null, hold: false });
      }
    };

    target.addEventListener("pointerdown", onPointerDown);
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", onPointerUp);
    target.addEventListener("pointercancel", onPointerCancel);
    target.addEventListener("pointerleave", onPointerLeave);

    return () => {
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("pointercancel", onPointerCancel);
      target.removeEventListener("pointerleave", onPointerLeave);
      cancelHoldTimer();
      stateRef.current.pointers.clear();
      stateRef.current.longPressed = false;
      stateRef.current.initialDistance = null;
      stateRef.current.initialAngle = null;
    };
  }, [
    targetRef,
    onGesture,
    onLeave,
    onLongPress,
    onTap,
    holdMs,
    holdJitterPx,
    tapMs,
    disabled,
  ]);
}

/**
 * React state companion to `useStageGesture` — sometimes you want the latest snapshot
 * for rendering rather than a callback. Use sparingly: re-renders on every pointer move.
 */
export function useStageGestureState(
  opts: Omit<GestureSourceOptions, "onGesture">,
): GestureSnapshot {
  const [snapshot, setSnapshot] = useState<GestureSnapshot>({ axes: null, hold: false });
  useStageGesture({ ...opts, onGesture: setSnapshot });
  return snapshot;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function normalizeAngle(a: number): number {
  // Wrap to (-π, π] so accumulated rotation makes sense for thresholding.
  let r = a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r <= -Math.PI) r += 2 * Math.PI;
  return r;
}
