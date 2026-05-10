import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AmbientParams, EvolutionSettings } from "../../lib/synth";
import type { EngineAnalyserLike, IAmbientEngine } from "../../lib/engine/types";
import type { ColorPaletteDef } from "../../constants/color-palettes";
import { COLOR_PALETTES } from "../../constants/color-palettes";
import { AmbientStage } from "../AmbientStage";
import { InstrumentHUD } from "./InstrumentHUD";
import { PaletteWheel } from "./PaletteWheel";
import {
  STAGE_ARIA,
  mapGestureToMacros,
  useEngineParamCommit,
  useStageA11y,
  useStageGesture,
  type GestureSnapshot,
  type MacroState,
  type StageAxes,
} from "../../lib/instrument";

export type InstrumentStageProps = {
  /** Canonical params (pre-macro projection). The instrument re-projects per-frame. */
  params: AmbientParams;
  settings: EvolutionSettings;
  isPlaying: boolean;
  prefersReducedMotion: boolean;
  analyser: EngineAnalyserLike | null;

  /** Engine ref for the param-commit pipeline. */
  engineRef: { current: IAmbientEngine | null };
  /** Project canonical params through the App's pipeline (macros, session arc). */
  computeEngineParams: (canonical: AmbientParams) => AmbientParams;

  /** Live macro snapshot (intensity & brightness 0..1) — drives HUD readout. */
  macros: MacroState;
  /**
   * Called per-RAF during a drag with the new macros. Caller should update refs
   * (no React state) so the param-commit pipeline can re-project.
   */
  onMacrosDrag: (next: MacroState) => void;
  /**
   * Called when the gesture ends (pointer up / leave). Caller persists to React state
   * here so secondary surfaces (lab sheet) reflect the new value.
   */
  onMacrosRelease: (final: MacroState) => void;

  /** Apply a palette pick (long-press wheel). */
  onPalettePick: (palette: ColorPaletteDef) => void;

  /** Toggle play (Space key, double-tap). */
  onTogglePlay: () => void;

  /** Open the secondary form drawer (M key). */
  onFocusMoodInput: () => void;

  /** Optional palette index hint from two-finger rotate / pinch. */
  onPaletteHintAdvance?: (delta: number) => void;

  /** Suppress gesture handling (e.g. when drawer or modal owns interaction). */
  disabled?: boolean;
};

const HUD_AUTO_HIDE_MS = 2400;

/**
 * Interactive instrument layer. Wraps the visual `AmbientStage` with a
 * transparent gesture-capture surface, HUD readout, palette wheel, and the
 * keyboard a11y hooks.
 *
 * Intentionally does NOT manage canonical `params` state — that lives in App.
 * We touch the engine directly via `useEngineParamCommit` to avoid React
 * re-renders per pointer-move frame.
 */
export function InstrumentStage(props: InstrumentStageProps) {
  const {
    params,
    settings,
    isPlaying,
    prefersReducedMotion,
    analyser,
    engineRef,
    computeEngineParams,
    macros,
    onMacrosDrag,
    onMacrosRelease,
    onPalettePick,
    onTogglePlay,
    onFocusMoodInput,
    onPaletteHintAdvance,
    disabled = false,
  } = props;

  const captureRef = useRef<HTMLDivElement>(null);
  const macrosRef = useRef<MacroState>(macros);
  macrosRef.current = macros;

  const paramsRef = useRef<AmbientParams>(params);
  paramsRef.current = params;

  const [hudVisible, setHudVisible] = useState(false);
  const [hudAnchor, setHudAnchor] = useState<{ x: number; y: number } | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelAnchor, setWheelAnchor] = useState<{ x: number; y: number } | null>(null);
  const hudHideTimerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const commit = useEngineParamCommit({ engineRef, computeEngineParams });

  const paletteName = useMemo(() => {
    const matched = COLOR_PALETTES.find(
      (p) =>
        p.colors[0] === params.colorPalette[0] &&
        p.colors[1] === params.colorPalette[1] &&
        p.colors[2] === params.colorPalette[2],
    );
    return matched?.name ?? "Custom";
  }, [params.colorPalette]);

  const scheduleHudHide = useCallback(() => {
    if (hudHideTimerRef.current !== null) {
      window.clearTimeout(hudHideTimerRef.current);
    }
    hudHideTimerRef.current = window.setTimeout(() => {
      if (!draggingRef.current) setHudVisible(false);
      hudHideTimerRef.current = null;
    }, HUD_AUTO_HIDE_MS);
  }, []);

  const showHud = useCallback(
    (anchor?: { x: number; y: number }) => {
      setHudVisible(true);
      if (anchor) setHudAnchor(anchor);
      scheduleHudHide();
    },
    [scheduleHudHide],
  );

  const onGesture = useCallback(
    (snap: GestureSnapshot) => {
      if (snap.axes) {
        // Show HUD anchored near pointer (clientX/clientY derived from rect).
        const rect = captureRef.current?.getBoundingClientRect();
        if (rect) {
          showHud({
            x: rect.left + snap.axes.x * rect.width,
            y: rect.top + snap.axes.y * rect.height,
          });
        }

        const delta = mapGestureToMacros(snap, macrosRef.current);
        if (delta.intensity !== undefined || delta.brightness !== undefined) {
          // Only treat as a drag if a pointer is held (hold === false during pure hover).
          // We commit even on hover for a "ghost preview" feel — but the param-commit
          // hook coalesces and the audio crossfade is short enough that it feels alive.
          draggingRef.current = true;
          const next: MacroState = {
            intensity: delta.intensity ?? macrosRef.current.intensity,
            brightness: delta.brightness ?? macrosRef.current.brightness,
          };
          macrosRef.current = next;
          onMacrosDrag(next);
          commit.commit(paramsRef.current);
        }
      }

      if (snap.pinch !== undefined || snap.rotation !== undefined) {
        const delta = mapGestureToMacros(snap, macrosRef.current);
        if (delta.paletteHintIndex && onPaletteHintAdvance) {
          onPaletteHintAdvance(delta.paletteHintIndex);
        }
      }
    },
    [commit, onMacrosDrag, onPaletteHintAdvance, showHud],
  );

  const onLeave = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      commit.release();
      onMacrosRelease(macrosRef.current);
    }
    scheduleHudHide();
  }, [commit, onMacrosRelease, scheduleHudHide]);

  const onLongPress = useCallback(
    (axes: StageAxes) => {
      const rect = captureRef.current?.getBoundingClientRect();
      if (!rect) return;
      const anchor = {
        x: rect.left + axes.x * rect.width,
        y: rect.top + axes.y * rect.height,
      };
      setWheelAnchor(anchor);
      setWheelOpen(true);
    },
    [],
  );

  const onTap = useCallback(
    (axes: StageAxes) => {
      const rect = captureRef.current?.getBoundingClientRect();
      if (rect) {
        showHud({
          x: rect.left + axes.x * rect.width,
          y: rect.top + axes.y * rect.height,
        });
      }
    },
    [showHud],
  );

  useStageGesture({
    targetRef: captureRef,
    onGesture,
    onLeave,
    onLongPress,
    onTap,
    disabled: disabled || wheelOpen,
  });

  // Keyboard equivalents — nudge macros, toggle play, etc.
  useStageA11y({
    macros,
    setMacros: (next) => {
      macrosRef.current = next;
      onMacrosDrag(next);
      commit.commit(paramsRef.current);
      // Keyboard nudges always release immediately so the lab sheet stays in sync.
      onMacrosRelease(next);
      showHud();
    },
    onTogglePlay,
    onOpenPalette: () => {
      const rect = captureRef.current?.getBoundingClientRect();
      const anchor = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      setWheelAnchor(anchor);
      setWheelOpen(true);
    },
    onFocusMoodInput,
    onEscape: () => {
      if (wheelOpen) setWheelOpen(false);
    },
    disabled,
  });

  useEffect(() => {
    return () => {
      if (hudHideTimerRef.current !== null) {
        window.clearTimeout(hudHideTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <AmbientStage
        params={params}
        settings={settings}
        isPlaying={isPlaying}
        prefersReducedMotion={prefersReducedMotion}
        analyser={analyser}
      />

      {/* Capture layer — sits ABOVE the visual ambient stage, BELOW UI chrome. */}
      <div
        ref={captureRef}
        {...STAGE_ARIA}
        className="absolute inset-0 z-[2]"
        style={{
          // Allow native cursor; we add a soft accent below.
          cursor: disabled ? "default" : "crosshair",
          // touch-action: none so two-finger gestures don't trigger zoom.
          touchAction: "none",
        }}
      />

      <InstrumentHUD
        intensity={macros.intensity}
        brightness={macros.brightness}
        paletteName={paletteName}
        visible={hudVisible}
        prefersReducedMotion={prefersReducedMotion}
        anchor={hudAnchor ?? undefined}
      />

      <PaletteWheel
        open={wheelOpen}
        anchor={wheelAnchor}
        selectedPaletteName={paletteName}
        onSelect={(p) => {
          onPalettePick(p);
          setWheelOpen(false);
        }}
        onClose={() => setWheelOpen(false)}
        prefersReducedMotion={prefersReducedMotion}
      />
    </>
  );
}
