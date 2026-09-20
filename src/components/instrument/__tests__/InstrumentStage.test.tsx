/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { InstrumentStage } from "../InstrumentStage";
import { defaultParams, defaultSettings } from "../../../lib/synth";
import type { IAmbientEngine } from "../../../lib/engine/types";
import type { MacroState } from "../../../lib/instrument";

// jsdom lacks PointerEvent; a MouseEvent carries the fields useStageGesture reads.
function fakePointerEvent(type: string, init: PointerEventInit): PointerEvent {
  const evt = new MouseEvent(type, {
    bubbles: true,
    clientX: init.clientX,
    clientY: init.clientY,
    buttons: init.buttons,
  }) as unknown as PointerEvent;
  Object.defineProperty(evt, "pointerId", { value: init.pointerId ?? 1 });
  Object.defineProperty(evt, "pointerType", { value: init.pointerType ?? "mouse" });
  return evt;
}

function makeEngineStub(): IAmbientEngine {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    dispose: vi.fn(),
    applyParams: vi.fn(),
    applyEvolutionSettings: vi.fn(),
    getAnalyser: vi.fn().mockReturnValue({ getValue: () => new Float32Array(0) }),
  };
}

beforeEach(() => {
  Element.prototype.getBoundingClientRect = vi.fn(
    () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 200,
        bottom: 100,
        width: 200,
        height: 100,
        toJSON: () => ({}),
      }) as DOMRect,
  );
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

describe("InstrumentStage gesture release", () => {
  it("commits onMacrosRelease when the pointer is released inside the stage (no pointerleave)", () => {
    const engineRef = { current: makeEngineStub() };
    const onMacrosDrag = vi.fn();
    const onMacrosRelease = vi.fn();

    const { container } = render(
      <InstrumentStage
        params={defaultParams}
        settings={defaultSettings}
        isPlaying
        prefersReducedMotion
        analyser={null}
        engineRef={engineRef}
        computeEngineParams={(p) => p}
        macros={{ intensity: 0.5, brightness: 0.5 }}
        onMacrosDrag={onMacrosDrag}
        onMacrosRelease={onMacrosRelease}
        onPalettePick={vi.fn()}
        onTogglePlay={vi.fn()}
        onFocusMoodInput={vi.fn()}
      />,
    );

    const stage = container.querySelector('[role="application"]');
    expect(stage).toBeTruthy();

    act(() => {
      stage!.dispatchEvent(
        fakePointerEvent("pointerdown", { clientX: 150, clientY: 20, pointerId: 1, buttons: 1 }),
      );
      stage!.dispatchEvent(
        fakePointerEvent("pointermove", { clientX: 180, clientY: 10, pointerId: 1, buttons: 1 }),
      );
      // Released *inside* the stage bounds — no pointerleave/pointercancel fires,
      // only pointerup. Regression test for the drag-release never committing.
      stage!.dispatchEvent(
        fakePointerEvent("pointerup", { clientX: 180, clientY: 10, pointerId: 1, buttons: 0 }),
      );
    });

    expect(onMacrosDrag).toHaveBeenCalled();
    expect(onMacrosRelease).toHaveBeenCalledTimes(1);
    const released = onMacrosRelease.mock.calls[0]![0] as MacroState;
    // x=180/200=0.9 -> intensity; y=10/100=0.1 -> brightness = 1 - 0.1 = 0.9
    expect(released.intensity).toBeCloseTo(0.9, 5);
    expect(released.brightness).toBeCloseTo(0.9, 5);
  });

  it("does not double-fire release when the pointer also leaves the stage", () => {
    const engineRef = { current: makeEngineStub() };
    const onMacrosRelease = vi.fn();

    const { container } = render(
      <InstrumentStage
        params={defaultParams}
        settings={defaultSettings}
        isPlaying
        prefersReducedMotion
        analyser={null}
        engineRef={engineRef}
        computeEngineParams={(p) => p}
        macros={{ intensity: 0.5, brightness: 0.5 }}
        onMacrosDrag={vi.fn()}
        onMacrosRelease={onMacrosRelease}
        onPalettePick={vi.fn()}
        onTogglePlay={vi.fn()}
        onFocusMoodInput={vi.fn()}
      />,
    );

    const stage = container.querySelector('[role="application"]');

    act(() => {
      stage!.dispatchEvent(
        fakePointerEvent("pointerdown", { clientX: 100, clientY: 50, pointerId: 1, buttons: 1 }),
      );
      stage!.dispatchEvent(
        fakePointerEvent("pointerup", { clientX: 100, clientY: 50, pointerId: 1, buttons: 0 }),
      );
      stage!.dispatchEvent(
        fakePointerEvent("pointerleave", { clientX: 100, clientY: 50, buttons: 0 }),
      );
    });

    expect(onMacrosRelease).toHaveBeenCalledTimes(1);
  });
});
