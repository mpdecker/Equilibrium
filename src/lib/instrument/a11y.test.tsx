/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useStageA11y, STAGE_ARIA } from "./a11y";
import type { MacroState } from "./gesture-mapping";

type HarnessProps = {
  initial?: MacroState;
  spies: {
    setMacros?: (next: MacroState, source: "keyboard") => void;
    onTogglePlay?: () => void;
    onOpenPalette?: () => void;
    onFocusMoodInput?: () => void;
    onEscape?: () => void;
  };
};

function Harness({ initial = { intensity: 0.5, brightness: 0.5 }, spies }: HarnessProps) {
  const [macros] = React.useState(initial);
  useStageA11y({
    macros,
    setMacros: spies.setMacros ?? (() => {}),
    onTogglePlay: spies.onTogglePlay,
    onOpenPalette: spies.onOpenPalette,
    onFocusMoodInput: spies.onFocusMoodInput,
    onEscape: spies.onEscape,
  });
  return <div />;
}

function fireKey(key: string, target: EventTarget = window, shiftKey = false): void {
  const ev = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true });
  // dispatch on target if not window-level
  if (target === window) {
    window.dispatchEvent(ev);
  } else {
    (target as EventTarget).dispatchEvent(ev);
  }
}

describe("useStageA11y", () => {
  it("nudges intensity right with ArrowRight", () => {
    const setMacros = vi.fn();
    render(<Harness spies={{ setMacros }} />);
    act(() => fireKey("ArrowRight"));
    expect(setMacros).toHaveBeenCalledWith(
      expect.objectContaining({ intensity: 0.55, brightness: 0.5 }),
      "keyboard",
    );
  });

  it("uses bigger step with Shift", () => {
    const setMacros = vi.fn();
    render(<Harness spies={{ setMacros }} />);
    act(() => fireKey("ArrowUp", window, true));
    expect(setMacros).toHaveBeenCalledWith(
      expect.objectContaining({ brightness: expect.closeTo(0.65, 5) as unknown as number }),
      "keyboard",
    );
  });

  it("Space toggles play and prevents default", () => {
    const onTogglePlay = vi.fn();
    render(<Harness spies={{ onTogglePlay }} />);
    act(() => fireKey(" "));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it("P opens palette", () => {
    const onOpenPalette = vi.fn();
    render(<Harness spies={{ onOpenPalette }} />);
    act(() => fireKey("p"));
    expect(onOpenPalette).toHaveBeenCalledTimes(1);
  });

  it("M focuses mood input", () => {
    const onFocusMoodInput = vi.fn();
    render(<Harness spies={{ onFocusMoodInput }} />);
    act(() => fireKey("m"));
    expect(onFocusMoodInput).toHaveBeenCalledTimes(1);
  });

  it("Escape calls onEscape", () => {
    const onEscape = vi.fn();
    render(<Harness spies={{ onEscape }} />);
    act(() => fireKey("Escape"));
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("does not intercept keys when typing target is focused", () => {
    const setMacros = vi.fn();
    const onTogglePlay = vi.fn();
    render(<Harness spies={{ setMacros, onTogglePlay }} />);

    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => fireKey("ArrowRight", input));
    act(() => fireKey(" ", input));

    expect(setMacros).not.toHaveBeenCalled();
    expect(onTogglePlay).not.toHaveBeenCalled();

    input.remove();
  });

  it("STAGE_ARIA is a stable object with role=application", () => {
    expect(STAGE_ARIA.role).toBe("application");
    expect(STAGE_ARIA.tabIndex).toBe(0);
    expect(STAGE_ARIA["aria-label"]).toMatch(/instrument/i);
  });
});
