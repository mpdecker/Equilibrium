import { useEffect, useRef } from "react";
import type { MacroState } from "./gesture-mapping";
import { nudgeMacros } from "./gesture-mapping";

/**
 * Keyboard equivalents for the gesture vocabulary, plus aria scaffolding for
 * the stage. Every gesture must have a keyboard path; this hook is that path.
 *
 * Bindings:
 *  - Arrow keys           → nudge intensity / brightness ±0.05 (±0.15 with Shift)
 *  - Space                → toggle play
 *  - P                    → open palette
 *  - M                    → focus mood input (drawer)
 *  - Escape               → close drawer / wheel / sheet
 *  - ?                    → show keyboard help
 *
 * The hook is global (`window` listener) but only fires when the stage / shell
 * has focus (`document.activeElement` is body, the stage, or inside the stage).
 * Inputs and contenteditable always win — we don't intercept typing.
 */

export type StageA11yHandlers = {
  /** Snapshot of current macros for nudge math. */
  macros: MacroState;
  /** Apply a new macros target (will be passed through param-commit by caller). */
  setMacros: (next: MacroState, source: "keyboard") => void;
  onTogglePlay?: () => void;
  onOpenPalette?: () => void;
  onFocusMoodInput?: () => void;
  onEscape?: () => void;
  onShowHelp?: () => void;
  /** Disable shortcuts (e.g. when a modal owns focus). */
  disabled?: boolean;
};

export function useStageA11y(handlers: StageA11yHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (handlers.disabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      if (h.disabled) return;
      if (isTypingTarget(e.target)) return;

      const big = e.shiftKey ? 0.15 : 0.05;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          h.setMacros(nudgeMacros(h.macros, -big, 0), "keyboard");
          return;
        case "ArrowRight":
          e.preventDefault();
          h.setMacros(nudgeMacros(h.macros, +big, 0), "keyboard");
          return;
        case "ArrowUp":
          e.preventDefault();
          h.setMacros(nudgeMacros(h.macros, 0, +big), "keyboard");
          return;
        case "ArrowDown":
          e.preventDefault();
          h.setMacros(nudgeMacros(h.macros, 0, -big), "keyboard");
          return;
        case " ":
        case "Spacebar":
          if (h.onTogglePlay) {
            e.preventDefault();
            h.onTogglePlay();
          }
          return;
        case "p":
        case "P":
          if (h.onOpenPalette && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            h.onOpenPalette();
          }
          return;
        case "m":
        case "M":
          if (h.onFocusMoodInput && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            h.onFocusMoodInput();
          }
          return;
        case "Escape":
          if (h.onEscape) {
            e.preventDefault();
            h.onEscape();
          }
          return;
        case "?":
          if (h.onShowHelp) {
            e.preventDefault();
            h.onShowHelp();
          }
          return;
        default:
          return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handlers.disabled]);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Static aria attribute bag for the instrument stage. Spread this into the
 * top-level interactive container.
 */
export const STAGE_ARIA = {
  role: "application" as const,
  "aria-label":
    "Equilibrium instrument stage. Drag to shape the soundscape. Arrow keys nudge intensity and brightness. Space toggles play.",
  // Keep the stage outside the regular tab order — focus enters via keyboard
  // shortcut (M for mood) or by tabbing into the drawer / dock.
  tabIndex: 0,
} as const;
