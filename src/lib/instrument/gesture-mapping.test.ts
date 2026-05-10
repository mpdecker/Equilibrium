import { describe, expect, it } from "vitest";
import {
  mapGestureToMacros,
  nudgeMacros,
  type GestureSnapshot,
  type MacroState,
} from "./gesture-mapping";

const PREV: MacroState = { intensity: 0.5, brightness: 0.5 };

describe("mapGestureToMacros", () => {
  it("emits no macro target when axes are null", () => {
    const result = mapGestureToMacros({ axes: null, hold: false }, PREV);
    expect(result.intensity).toBeUndefined();
    expect(result.brightness).toBeUndefined();
  });

  it("maps X axis to intensity (left=0, right=1)", () => {
    const left = mapGestureToMacros({ axes: { x: 0, y: 0.5 }, hold: false }, PREV);
    const right = mapGestureToMacros({ axes: { x: 1, y: 0.5 }, hold: false }, PREV);
    expect(left.intensity).toBe(0);
    expect(right.intensity).toBe(1);
  });

  it("maps Y axis to brightness (top=1, bottom=0) — up is brighter", () => {
    const top = mapGestureToMacros({ axes: { x: 0.5, y: 0 }, hold: false }, PREV);
    const bottom = mapGestureToMacros({ axes: { x: 0.5, y: 1 }, hold: false }, PREV);
    expect(top.brightness).toBe(1);
    expect(bottom.brightness).toBe(0);
  });

  it("clamps macros to [0, 1]", () => {
    const wild = mapGestureToMacros({ axes: { x: 99, y: -99 }, hold: false }, PREV);
    expect(wild.intensity).toBe(1);
    expect(wild.brightness).toBe(1);
  });

  it("respects sensitivity < 1 by smoothing toward the target", () => {
    const half = mapGestureToMacros({ axes: { x: 1, y: 0.5 }, hold: false }, PREV, {
      intensitySensitivity: 0.5,
    });
    expect(half.intensity).toBeCloseTo(0.75, 5);
  });

  it("emits paletteHintIndex from rotation when threshold is exceeded", () => {
    const turn: GestureSnapshot = { axes: null, hold: false, rotation: Math.PI / 2 };
    const result = mapGestureToMacros(turn, PREV);
    expect(result.paletteHintIndex).toBe(2);
  });

  it("emits paletteHintIndex from pinch when threshold is exceeded", () => {
    const pinchOut: GestureSnapshot = { axes: null, hold: false, pinch: 1.4 };
    const pinchIn: GestureSnapshot = { axes: null, hold: false, pinch: 0.55 };
    expect(mapGestureToMacros(pinchOut, PREV).paletteHintIndex).toBe(2);
    expect(mapGestureToMacros(pinchIn, PREV).paletteHintIndex).toBe(-2);
  });

  it("combines rotation + pinch into a single paletteHintIndex", () => {
    const both: GestureSnapshot = {
      axes: null,
      hold: false,
      rotation: Math.PI / 4,
      pinch: 1.2,
    };
    const result = mapGestureToMacros(both, PREV);
    expect(result.paletteHintIndex).toBe(2);
  });
});

describe("nudgeMacros", () => {
  it("applies relative deltas with clamping", () => {
    expect(nudgeMacros({ intensity: 0.5, brightness: 0.5 }, 0.1, -0.1)).toEqual({
      intensity: 0.6,
      brightness: 0.4,
    });
  });

  it("clamps below 0 and above 1", () => {
    expect(nudgeMacros({ intensity: 0, brightness: 1 }, -0.1, 0.1)).toEqual({
      intensity: 0,
      brightness: 1,
    });
  });
});
