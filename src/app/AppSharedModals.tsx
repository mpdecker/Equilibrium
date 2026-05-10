import React from "react";
import { PaletteModal } from "../components/PaletteModal";
import { AudioLabSheet } from "../components/AudioLabSheet";
import { JournalComposer } from "../components/JournalComposer";
import { SessionCompleteDialog } from "../components/SessionCompleteDialog";
import type { AmbientParams, EvolutionSettings } from "../lib/synth";
import type { ShadowComparisonResult } from "../lib/audio-shadow";
import type { RuntimeSynthesisMode } from "../lib/audio-engine-preference";
import type { ColorPaletteDef } from "../constants/color-palettes";
import type { AudioRolloutState } from "./audio-rollout-state";

export type AppSharedModalsProps = {
  showPaletteModal: boolean;
  onClosePaletteModal: () => void;
  onSelectPalette: (palette: ColorPaletteDef) => void;
  isComposingJournal: boolean;
  composeText: string;
  isSavingJournal: boolean;
  onComposeTextChange: (v: string) => void;
  onCloseJournalComposer: () => void;
  onSaveJournal: () => void;
  showAudioLab: boolean;
  onCloseAudioLab: () => void;
  resolvedRuntime: RuntimeSynthesisMode;
  rollout: AudioRolloutState | null;
  lastShadowDiagnostics: ShadowComparisonResult | null;
  isPlaying: boolean;
  isStarting: boolean;
  onTogglePlay: () => void;
  intensityPlayback: number;
  onIntensityChange: (v: number) => void;
  brightnessPlayback: number;
  onBrightnessChange: (v: number) => void;
  onOpenPalettesFromLab: () => void;
  params: AmbientParams;
  onParamsChange: (next: AmbientParams) => void;
  settings: EvolutionSettings;
  onSettingsChange: (next: EvolutionSettings) => void;
  sessionCompleteOpen: boolean;
  onCloseSessionComplete: () => void;
  onSessionCompleteFeedback: (feedback: string) => Promise<void>;
  onSessionCompleteReflect: () => void;
  onSessionCompleteJournal: () => void;
  onReplayWalkthrough?: () => void;
};

export function AppSharedModals({
  showPaletteModal,
  onClosePaletteModal,
  onSelectPalette,
  isComposingJournal,
  composeText,
  isSavingJournal,
  onComposeTextChange,
  onCloseJournalComposer,
  onSaveJournal,
  showAudioLab,
  onCloseAudioLab,
  resolvedRuntime,
  rollout,
  lastShadowDiagnostics,
  isPlaying,
  isStarting,
  onTogglePlay,
  intensityPlayback,
  onIntensityChange,
  brightnessPlayback,
  onBrightnessChange,
  onOpenPalettesFromLab,
  params,
  onParamsChange,
  settings,
  onSettingsChange,
  sessionCompleteOpen,
  onCloseSessionComplete,
  onSessionCompleteFeedback,
  onSessionCompleteReflect,
  onSessionCompleteJournal,
  onReplayWalkthrough,
}: AppSharedModalsProps) {
  return (
    <>
      <PaletteModal
        open={showPaletteModal}
        onClose={onClosePaletteModal}
        onSelectPalette={onSelectPalette}
      />

      <JournalComposer
        open={isComposingJournal}
        value={composeText}
        isSaving={isSavingJournal}
        onChange={onComposeTextChange}
        onClose={onCloseJournalComposer}
        onSave={onSaveJournal}
      />

      <AudioLabSheet
        open={showAudioLab}
        onClose={onCloseAudioLab}
        resolvedRuntime={resolvedRuntime}
        rollout={rollout}
        lastShadowDiagnostics={lastShadowDiagnostics}
        isPlaying={isPlaying}
        isStarting={isStarting}
        onTogglePlay={onTogglePlay}
        showPlaybackMacros={isPlaying}
        intensityPlayback={intensityPlayback}
        onIntensityChange={onIntensityChange}
        brightnessPlayback={brightnessPlayback}
        onBrightnessChange={onBrightnessChange}
        onOpenPalettes={onOpenPalettesFromLab}
        colorPalettePreview={params.colorPalette}
        params={params}
        onParamsChange={onParamsChange}
        settings={settings}
        onSettingsChange={onSettingsChange}
        onReplayWalkthrough={onReplayWalkthrough}
      />

      <SessionCompleteDialog
        open={sessionCompleteOpen}
        onClose={onCloseSessionComplete}
        onSelectFeedback={(feedback) =>
          void onSessionCompleteFeedback(feedback).then(() => onCloseSessionComplete())
        }
        onReflect={onSessionCompleteReflect}
        onJournal={onSessionCompleteJournal}
      />
    </>
  );
}
