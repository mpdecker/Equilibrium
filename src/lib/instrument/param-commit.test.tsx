/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useEngineParamCommit, type ParamCommitController } from "./param-commit";
import type { AmbientParams } from "../music-schema";
import type { IAmbientEngine, EngineAnalyserLike } from "../engine/types";

const baseParams = {
  baseFrequency: 110,
  oscillatorType: "sine",
  chordIntervals: [0, 7, 14],
  noiseType: "pink",
  noiseAmount: 0.2,
  lfoSpeed: 0.5,
  delayTime: "4n",
  complexity: 0.5,
  reverbWet: 0.5,
  harmonicity: 1.5,
  modulationIndex: 1.5,
  filterCutoffMax: 1500,
  filterQ: 1.0,
  attack: 1.5,
  release: 4,
  colorPalette: ["#000", "#111", "#222"],
} as unknown as AmbientParams;

function makeFakeEngine(): IAmbientEngine & { applyParams: ReturnType<typeof vi.fn> } {
  const fake = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    dispose: vi.fn(),
    applyParams: vi.fn(),
    applyEvolutionSettings: vi.fn(),
    getAnalyser: vi.fn(
      (): EngineAnalyserLike => ({
        getValue: () => new Float32Array(0),
      }),
    ),
  };
  return fake as IAmbientEngine & { applyParams: ReturnType<typeof vi.fn> };
}

type HarnessProps = {
  engine: IAmbientEngine | null;
  onReady: (c: ParamCommitController) => void;
};

function Harness({ engine, onReady }: HarnessProps) {
  const ref = React.useRef<IAmbientEngine | null>(engine);
  ref.current = engine;
  const ctl = useEngineParamCommit({
    engineRef: ref,
    idleMs: 50,
    dragRampSec: 0.05,
    releaseRampSec: 0.6,
  });
  React.useEffect(() => {
    onReady(ctl);
  }, [ctl, onReady]);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  // Use a controllable RAF that fires synchronously when we advance timers.
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const handle = ++id;
    setTimeout(() => cb(performance.now()), 16);
    return handle;
  });
  vi.stubGlobal("cancelAnimationFrame", (_handle: number) => {
    // tests rely on setTimeout cancellation; shrug — fine for these unit tests
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useEngineParamCommit", () => {
  it("coalesces multiple commits within one RAF into one applyParams call", () => {
    const engine = makeFakeEngine();
    let ctl: ParamCommitController | null = null;
    render(<Harness engine={engine} onReady={(c) => (ctl = c)} />);

    act(() => {
      ctl!.commit({ ...baseParams, complexity: 0.1 });
      ctl!.commit({ ...baseParams, complexity: 0.2 });
      ctl!.commit({ ...baseParams, complexity: 0.3 });
    });
    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(engine.applyParams).toHaveBeenCalledTimes(1);
    const lastArg = engine.applyParams.mock.calls[0][0] as AmbientParams;
    expect(lastArg.complexity).toBe(0.3);
  });

  it("calls applyParams with releaseRampSec after idleMs of inactivity", () => {
    const engine = makeFakeEngine();
    let ctl: ParamCommitController | null = null;
    render(<Harness engine={engine} onReady={(c) => (ctl = c)} />);

    act(() => {
      ctl!.commit({ ...baseParams, complexity: 0.4 });
    });
    act(() => {
      vi.advanceTimersByTime(20); // RAF flush with drag ramp
    });
    act(() => {
      vi.advanceTimersByTime(60); // idle timer fires release ramp
    });

    expect(engine.applyParams).toHaveBeenCalledTimes(2);
    const releaseHint = engine.applyParams.mock.calls[1][1];
    expect(releaseHint?.rampSeconds).toBeCloseTo(0.6, 2);
  });

  it("commitImmediate flushes synchronously and uses the provided hint", () => {
    const engine = makeFakeEngine();
    let ctl: ParamCommitController | null = null;
    render(<Harness engine={engine} onReady={(c) => (ctl = c)} />);

    act(() => {
      ctl!.commitImmediate({ ...baseParams, complexity: 0.7 }, { rampSeconds: 2.5 });
    });

    expect(engine.applyParams).toHaveBeenCalledTimes(1);
    expect(engine.applyParams.mock.calls[0][1]?.rampSeconds).toBe(2.5);
  });

  it("release() flushes pending and applies release ramp", () => {
    const engine = makeFakeEngine();
    let ctl: ParamCommitController | null = null;
    render(<Harness engine={engine} onReady={(c) => (ctl = c)} />);

    act(() => {
      ctl!.commit({ ...baseParams, complexity: 0.9 });
      // No timer advance — release before RAF fires.
      ctl!.release();
    });

    expect(engine.applyParams).toHaveBeenCalledTimes(1);
    expect(engine.applyParams.mock.calls[0][1]?.rampSeconds).toBeCloseTo(0.6, 2);
  });

  it("cancel() prevents any pending apply", () => {
    const engine = makeFakeEngine();
    let ctl: ParamCommitController | null = null;
    render(<Harness engine={engine} onReady={(c) => (ctl = c)} />);

    act(() => {
      ctl!.commit({ ...baseParams, complexity: 0.9 });
      ctl!.cancel();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(engine.applyParams).not.toHaveBeenCalled();
  });

  it("noop when engine is null", () => {
    let ctl: ParamCommitController | null = null;
    render(<Harness engine={null} onReady={(c) => (ctl = c)} />);

    act(() => {
      ctl!.commit({ ...baseParams, complexity: 0.5 });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // No engine — no throw, nothing to assert beyond surviving the call.
    expect(true).toBe(true);
  });
});
