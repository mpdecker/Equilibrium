/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useStageGesture } from "./gesture-source";
import type { GestureSnapshot, StageAxes } from "./gesture-mapping";

type HarnessProps = {
  onGesture: (s: GestureSnapshot) => void;
  onLongPress?: (a: StageAxes) => void;
  onTap?: (a: StageAxes) => void;
  disabled?: boolean;
};

function Harness({ onGesture, onLongPress, onTap, disabled }: HarnessProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  useStageGesture({
    targetRef: ref,
    onGesture,
    onLongPress,
    onTap,
    disabled,
    holdMs: 50,
    tapMs: 100,
  });
  return <div data-testid="stage" ref={ref} style={{ width: 200, height: 100 }} />;
}

function fakePointerEvent(type: string, init: PointerEventInit): PointerEvent {
  // jsdom lacks PointerEvent; fall back to a MouseEvent shape with required fields.
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

beforeEach(() => {
  // Mock getBoundingClientRect to a known box so axes math is predictable.
  Element.prototype.getBoundingClientRect = vi.fn(() =>
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
  // setPointerCapture / releasePointerCapture aren't in jsdom either.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useStageGesture", () => {
  it("emits axes on hover (no button)", () => {
    const onGesture = vi.fn<(s: GestureSnapshot) => void>();
    const { getByTestId } = render(<Harness onGesture={onGesture} />);
    const stage = getByTestId("stage");

    act(() => {
      stage.dispatchEvent(fakePointerEvent("pointermove", { clientX: 100, clientY: 50 }));
    });

    const last = onGesture.mock.calls.at(-1)?.[0];
    expect(last?.axes).toEqual({ x: 0.5, y: 0.5 });
    expect(last?.hold).toBe(false);
  });

  it("emits null axes on pointerleave", () => {
    const onGesture = vi.fn<(s: GestureSnapshot) => void>();
    const { getByTestId } = render(<Harness onGesture={onGesture} />);
    const stage = getByTestId("stage");

    act(() => {
      stage.dispatchEvent(fakePointerEvent("pointermove", { clientX: 50, clientY: 50 }));
      stage.dispatchEvent(fakePointerEvent("pointerleave", { clientX: 0, clientY: 0, buttons: 0 }));
    });

    const last = onGesture.mock.calls.at(-1)?.[0];
    expect(last?.axes).toBeNull();
  });

  it("fires onTap for quick down+up without movement", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const onGesture = vi.fn();
    const { getByTestId } = render(<Harness onGesture={onGesture} onTap={onTap} />);
    const stage = getByTestId("stage");

    act(() => {
      stage.dispatchEvent(
        fakePointerEvent("pointerdown", { clientX: 100, clientY: 50, pointerId: 1 }),
      );
      vi.advanceTimersByTime(20);
      stage.dispatchEvent(
        fakePointerEvent("pointerup", { clientX: 100, clientY: 50, pointerId: 1 }),
      );
    });

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onTap.mock.calls[0][0]).toEqual({ x: 0.5, y: 0.5 });
  });

  it("fires onLongPress after holdMs of stationary contact", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const onGesture = vi.fn();
    const { getByTestId } = render(
      <Harness onGesture={onGesture} onLongPress={onLongPress} />,
    );
    const stage = getByTestId("stage");

    act(() => {
      stage.dispatchEvent(
        fakePointerEvent("pointerdown", { clientX: 100, clientY: 50, pointerId: 1 }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
    const last = onGesture.mock.calls.at(-1)?.[0];
    expect(last?.hold).toBe(true);
  });

  it("does NOT fire onLongPress if pointer moves beyond jitter threshold", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const onGesture = vi.fn();
    const { getByTestId } = render(
      <Harness onGesture={onGesture} onLongPress={onLongPress} />,
    );
    const stage = getByTestId("stage");

    act(() => {
      stage.dispatchEvent(
        fakePointerEvent("pointerdown", { clientX: 100, clientY: 50, pointerId: 1 }),
      );
      stage.dispatchEvent(
        fakePointerEvent("pointermove", { clientX: 130, clientY: 50, pointerId: 1 }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("emits rotation + pinch when two pointers are active", () => {
    const onGesture = vi.fn<(s: GestureSnapshot) => void>();
    const { getByTestId } = render(<Harness onGesture={onGesture} />);
    const stage = getByTestId("stage");

    act(() => {
      stage.dispatchEvent(
        fakePointerEvent("pointerdown", { clientX: 50, clientY: 50, pointerId: 1 }),
      );
      stage.dispatchEvent(
        fakePointerEvent("pointerdown", { clientX: 100, clientY: 50, pointerId: 2 }),
      );
    });

    act(() => {
      // Move pointer 2 away (zoom-out gesture) and rotate slightly.
      stage.dispatchEvent(
        fakePointerEvent("pointermove", { clientX: 150, clientY: 70, pointerId: 2 }),
      );
    });

    const last = onGesture.mock.calls.at(-1)?.[0];
    expect(last?.axes).toBeNull();
    expect(last?.pinch).toBeGreaterThan(1);
    expect(last?.rotation).toBeDefined();
  });

  it("noop when disabled", () => {
    const onGesture = vi.fn();
    const { getByTestId } = render(<Harness onGesture={onGesture} disabled />);
    const stage = getByTestId("stage");

    act(() => {
      stage.dispatchEvent(fakePointerEvent("pointermove", { clientX: 100, clientY: 50 }));
    });

    expect(onGesture).not.toHaveBeenCalled();
  });
});
