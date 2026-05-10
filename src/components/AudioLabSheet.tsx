import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { AmbientParams, EvolutionSettings } from "../lib/synth";
import type { ShadowComparisonResult } from "../lib/audio-shadow";
import type { ServerInstrumentRolloutValue } from "../lib/instrument/feature-flag";
import type { RuntimeSynthesisMode } from "../lib/audio-engine-preference";
import {
  readAudioLabExpertOpen,
  writeAudioLabExpertOpen,
} from "../lib/instrument/audio-lab-prefs";
import { MOTION, withReducedMotion } from "../lib/instrument/motion-system";
import { BottomSheet } from "./BottomSheet";
import { VS } from "../constants/visual-system";
import { cx } from "../lib/cx";
import { NowPlayingPanel } from "./audio-lab/NowPlayingPanel";
import { PaletteSection } from "./audio-lab/PaletteSection";
import { EnginePanel } from "./audio-lab/EnginePanel";
import { AgenticEvolution } from "./audio-lab/AgenticEvolution";
import { AdvancedSoundDesign } from "./audio-lab/AdvancedSoundDesign";

export type AudioRolloutSnapshot = {
  engine: string;
  effectiveEngine: "tone" | "stub" | "wasm";
  shadowMode: boolean;
  schemaVersion: number;
  instrument?: ServerInstrumentRolloutValue;
};

export type AudioLabSheetProps = {
  open: boolean;
  onClose: () => void;
  resolvedRuntime: RuntimeSynthesisMode;
  rollout: AudioRolloutSnapshot | null;
  lastShadowDiagnostics: ShadowComparisonResult | null;
  isPlaying: boolean;
  isStarting: boolean;
  onTogglePlay: () => void;
  /** Playback macros — shown when audio has been started at least once in session */
  showPlaybackMacros: boolean;
  intensityPlayback: number;
  onIntensityChange: (v: number) => void;
  brightnessPlayback: number;
  onBrightnessChange: (v: number) => void;
  onOpenPalettes: () => void;
  colorPalettePreview: string[];
  params: AmbientParams;
  onParamsChange: (next: AmbientParams) => void;
  settings: EvolutionSettings;
  onSettingsChange: (next: EvolutionSettings) => void;
  onReplayWalkthrough?: () => void;
};

export function AudioLabSheet({
  open,
  onClose,
  resolvedRuntime,
  rollout,
  lastShadowDiagnostics,
  isPlaying,
  isStarting,
  onTogglePlay,
  showPlaybackMacros,
  intensityPlayback,
  onIntensityChange,
  brightnessPlayback,
  onBrightnessChange,
  onOpenPalettes,
  colorPalettePreview,
  params,
  onParamsChange,
  settings,
  onSettingsChange,
  onReplayWalkthrough,
}: AudioLabSheetProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const collapseTransition = withReducedMotion(MOTION.surface.collapse, prefersReducedMotion);
  const [expertOpen, setExpertOpen] = useState(() => readAudioLabExpertOpen());

  useEffect(() => {
    writeAudioLabExpertOpen(expertOpen);
  }, [expertOpen]);

  const runtimeLabel =
    resolvedRuntime === "preview"
      ? "Preview synthesis"
      : resolvedRuntime === "wasm"
        ? "Worklet synthesis"
        : "Studio synthesis";

  const engineRollout =
    rollout === null
      ? null
      : { engine: rollout.engine, effectiveEngine: rollout.effectiveEngine, shadowMode: rollout.shadowMode };

  const rm = prefersReducedMotion;

  return (
    <BottomSheet open={open} title="Audio Lab" onClose={onClose} maxHeight="92vh">
      <div className="space-y-8">
        <NowPlayingPanel
          runtimeLabel={runtimeLabel}
          isPlaying={isPlaying}
          isStarting={isStarting}
          onTogglePlay={onTogglePlay}
          showPlaybackMacros={showPlaybackMacros}
          intensityPlayback={intensityPlayback}
          onIntensityChange={onIntensityChange}
          brightnessPlayback={brightnessPlayback}
          onBrightnessChange={onBrightnessChange}
        />

        <PaletteSection colorPalettePreview={colorPalettePreview} onOpenPalettes={onOpenPalettes} />

        <button
          type="button"
          aria-expanded={expertOpen}
          aria-controls="audio-lab-expert"
          onClick={() => setExpertOpen((v) => !v)}
          className={cx(VS.pillGhost, "mt-2 px-4 py-2 inline-flex items-center gap-2")}
        >
          <ChevronDown className={cx("w-4 h-4 transition-transform shrink-0", expertOpen && "rotate-180")} aria-hidden />
          {expertOpen ? "Hide expert controls" : "Show expert controls"}
        </button>

        <AnimatePresence initial={false}>
          {expertOpen ? (
            <motion.section
              id="audio-lab-expert"
              key="expert"
              initial={rm ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={rm ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={rm ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={collapseTransition}
              className="overflow-hidden space-y-8 pt-2"
            >
              <EnginePanel
                playbackRuntimeLabel={runtimeLabel}
                settings={settings}
                onSettingsChange={onSettingsChange}
                rollout={engineRollout}
                lastShadowDiagnostics={lastShadowDiagnostics}
              />
              <AgenticEvolution settings={settings} onSettingsChange={onSettingsChange} />
              <AdvancedSoundDesign params={params} onParamsChange={onParamsChange} />
            </motion.section>
          ) : null}
        </AnimatePresence>

        {onReplayWalkthrough ? (
          <div className="pt-6 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onReplayWalkthrough}
              className={cx(VS.pillGhost, "w-full px-4 py-3 text-[11px]")}
            >
              Replay stage walkthrough
            </button>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  );
}
