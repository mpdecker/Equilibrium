import { useCallback, useEffect, useRef } from "react";
import type { AmbientParams } from "../music-schema";
import type { ApplyParamsHint, IAmbientEngine } from "../engine/types";

/**
 * Throttle + RAF-coalesce engine param updates driven by continuous gestures.
 *
 * Why: drag emits 60–120 events/sec. Calling `engine.applyParams` that often
 * causes audible zipper noise on Tone synths (`.set` is not param-rate) and
 * unnecessary GC churn on the worklet path.
 *
 * Strategy:
 *  - During a gesture, coalesce to one apply per RAF (~60Hz).
 *  - Skip the apply entirely if `params` reference hasn't changed.
 *  - On `idle()` (called when the gesture ends), schedule one final apply with
 *    `rampSeconds = releaseRampSec` so the engine glides to the rest value
 *    instead of holding the last drag-frame value.
 *
 * The hook has no React state — all bookkeeping lives in refs to avoid
 * re-renders during drag; that is the intended instrument-mode perf posture (Phase 6).
 */

export type ParamCommitOptions = {
  /** Engine reference. May be null while the engine is being created/swapped. */
  engineRef: { current: IAmbientEngine | null };
  /** Project a canonical AmbientParams through any pipeline (macros, session arc, etc.). */
  computeEngineParams?: (canonical: AmbientParams) => AmbientParams;
  /** Crossfade time on release. Default 1.2s — matches MOTION.instrument.settle. */
  releaseRampSec?: number;
  /** Idle threshold before "release" fires. Default 120 ms. */
  idleMs?: number;
  /** Per-frame ramp time during drag. Default 0.08 (80 ms) for smoothness without lag. */
  dragRampSec?: number;
};

export type ParamCommitController = {
  /** Schedule a coalesced commit. Cheap to call from gesture callbacks. */
  commit: (next: AmbientParams) => void;
  /** Force an immediate commit, bypassing RAF coalescing (e.g. on palette pick). */
  commitImmediate: (next: AmbientParams, hint?: ApplyParamsHint) => void;
  /** Signal the gesture has ended — schedule the release ramp. */
  release: () => void;
  /** Cancel any pending commit / release timers. */
  cancel: () => void;
};

const DEFAULTS = {
  releaseRampSec: 1.2,
  idleMs: 120,
  dragRampSec: 0.08,
};

export function useEngineParamCommit(opts: ParamCommitOptions): ParamCommitController {
  const {
    engineRef,
    computeEngineParams,
    releaseRampSec = DEFAULTS.releaseRampSec,
    idleMs = DEFAULTS.idleMs,
    dragRampSec = DEFAULTS.dragRampSec,
  } = opts;

  const pendingRef = useRef<AmbientParams | null>(null);
  const rafRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const lastAppliedRef = useRef<{ params: AmbientParams; ramp: number | undefined } | null>(null);

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cancelIdle = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const flush = useCallback(
    (hint?: ApplyParamsHint) => {
      const next = pendingRef.current;
      if (!next) return;
      const engine = engineRef.current;
      if (!engine) return;
      const ramp = hint?.rampSeconds ?? dragRampSec;
      const last = lastAppliedRef.current;
      // Skip only when both params reference and ramp are unchanged — this lets
      // the release-ramp re-apply the same value with a longer ramp.
      if (last && last.params === next && last.ramp === ramp) return;
      lastAppliedRef.current = { params: next, ramp };
      const projected = computeEngineParams ? computeEngineParams(next) : next;
      engine.applyParams(projected, { rampSeconds: ramp });
    },
    [engineRef, computeEngineParams, dragRampSec],
  );

  const commit = useCallback(
    (next: AmbientParams) => {
      pendingRef.current = next;
      cancelIdle();
      // Schedule new idle timer to fire `release` ramp.
      idleTimerRef.current = window.setTimeout(() => {
        flush({ rampSeconds: releaseRampSec });
        idleTimerRef.current = null;
      }, idleMs);
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        flush({ rampSeconds: dragRampSec });
      });
    },
    [cancelIdle, flush, idleMs, releaseRampSec, dragRampSec],
  );

  const commitImmediate = useCallback(
    (next: AmbientParams, hint?: ApplyParamsHint) => {
      pendingRef.current = next;
      cancelRaf();
      cancelIdle();
      flush(hint);
    },
    [cancelRaf, cancelIdle, flush],
  );

  const release = useCallback(() => {
    cancelIdle();
    if (pendingRef.current) {
      cancelRaf();
      flush({ rampSeconds: releaseRampSec });
    }
  }, [cancelRaf, cancelIdle, flush, releaseRampSec]);

  const cancel = useCallback(() => {
    cancelRaf();
    cancelIdle();
    pendingRef.current = null;
  }, [cancelRaf, cancelIdle]);

  useEffect(() => {
    return () => {
      cancelRaf();
      cancelIdle();
    };
  }, [cancelRaf, cancelIdle]);

  return { commit, commitImmediate, release, cancel };
}
