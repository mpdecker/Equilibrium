import React from "react";
import { AnimatePresence } from "motion/react";
import { InstrumentStage } from "../components/instrument/InstrumentStage";
import { InstrumentDrawer } from "../components/instrument/InstrumentDrawer";
import { MobileInstrumentDock } from "../components/instrument/MobileInstrumentDock";
import { AppHeader } from "../components/AppHeader";
import { DesktopPrimaryTabs, type PrimaryTabId } from "../components/PrimaryNavigation";
import { DesktopNowPlayingFooter } from "../components/NowPlayingDock";
import { JournalHistoryPanel } from "../components/JournalHistoryPanel";
import type { AmbientParams, EvolutionSettings } from "../lib/synth";
import type { EngineAnalyserLike, IAmbientEngine } from "../lib/engine/types";
import type { MacroState } from "../lib/instrument";
import type { JournalListItem } from "../lib/journal-merge";
import type { ColorPaletteDef } from "../constants/color-palettes";

export type InstrumentAppLayoutProps = {
  sessionA11yTip: { id: number; msg: string };
  params: AmbientParams;
  settings: EvolutionSettings;
  isPlaying: boolean;
  isStarting: boolean;
  prefersReducedMotion: boolean;
  analyser: EngineAnalyserLike | null;
  engineRef: React.RefObject<IAmbientEngine | null>;
  computeEngineParams: (canonical: AmbientParams) => AmbientParams;
  instrumentMacros: MacroState;
  handleMacrosDrag: (next: MacroState) => void;
  handleMacrosRelease: (final: MacroState) => void;
  handlePalettePick: (palette: ColorPaletteDef) => void;
  togglePlay: () => Promise<void>;
  handleFocusMoodInput: () => void;
  handlePaletteHintAdvance: (delta: number) => void;
  isComposingJournal: boolean;
  showPaletteModal: boolean;
  showAudioLab: boolean;
  netOnline: boolean;
  outboxPending: number;
  outboxSyncing: boolean;
  showJournal: boolean;
  onOpenDrawer: () => void;
  onOpenDrawerAndCompose: () => void;
  onToggleJournal: () => void;
  onOpenAudioLab: () => void;
  journals: JournalListItem[];
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  journeyTrail: React.ReactNode;
  mainTab: PrimaryTabId;
  onMainTabChange: (id: PrimaryTabId) => void;
  tabContent: React.ReactNode;
  playbackStatusLine: string;
  sessionProgress: number | null;
  sessionDurationPick: number;
  onOpenPalettes: () => void;
  sharedModals: React.ReactNode;
};

export function InstrumentAppLayout({
  sessionA11yTip,
  params,
  settings,
  isPlaying,
  isStarting,
  prefersReducedMotion,
  analyser,
  engineRef,
  computeEngineParams,
  instrumentMacros,
  handleMacrosDrag,
  handleMacrosRelease,
  handlePalettePick,
  togglePlay,
  handleFocusMoodInput,
  handlePaletteHintAdvance,
  isComposingJournal,
  showPaletteModal,
  showAudioLab,
  netOnline,
  outboxPending,
  outboxSyncing,
  showJournal,
  onOpenDrawer,
  onOpenDrawerAndCompose,
  onToggleJournal,
  onOpenAudioLab,
  journals,
  drawerOpen,
  onDrawerOpenChange,
  journeyTrail,
  mainTab,
  onMainTabChange,
  tabContent,
  playbackStatusLine,
  sessionProgress,
  sessionDurationPick,
  onOpenPalettes,
  sharedModals,
}: InstrumentAppLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-eq-void text-eq-ink selection:bg-eq-glow/20 font-sans">
      <p key={sessionA11yTip.id} className="sr-only" aria-live="polite" aria-atomic="true">
        {sessionA11yTip.msg}
      </p>
      <InstrumentStage
        params={params}
        settings={settings}
        isPlaying={isPlaying}
        prefersReducedMotion={prefersReducedMotion}
        analyser={analyser}
        engineRef={engineRef}
        computeEngineParams={computeEngineParams}
        macros={instrumentMacros}
        onMacrosDrag={handleMacrosDrag}
        onMacrosRelease={handleMacrosRelease}
        onPalettePick={handlePalettePick}
        onTogglePlay={() => void togglePlay()}
        onFocusMoodInput={handleFocusMoodInput}
        onPaletteHintAdvance={handlePaletteHintAdvance}
        disabled={isComposingJournal || showPaletteModal || showAudioLab}
      />

      <div className="fixed top-0 left-0 right-0 z-[10] px-4 pt-4 md:px-8 md:pt-6 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          <AppHeader
            netOnline={netOnline}
            outboxPending={outboxPending}
            outboxSyncing={outboxSyncing}
            showJournal={showJournal}
            showAudioLab={showAudioLab}
            onWrite={onOpenDrawerAndCompose}
            onToggleJournal={onToggleJournal}
            onOpenAudioLab={onOpenAudioLab}
          />
        </div>
      </div>

      <AnimatePresence>
        {showJournal && (
          <div className="fixed top-28 bottom-8 right-0 z-[12] flex items-stretch justify-end pointer-events-none pl-4 md:top-32">
            <JournalHistoryPanel journals={journals} />
          </div>
        )}
      </AnimatePresence>

      <InstrumentDrawer
        open={drawerOpen}
        onOpenChange={onDrawerOpenChange}
        prefersReducedMotion={prefersReducedMotion}
        trail={journeyTrail}
        tabs={<DesktopPrimaryTabs mainTab={mainTab} onTabChange={onMainTabChange} />}
        title={mainTab === "practice" ? "Compose" : mainTab === "session" ? "Session" : "Reflect"}
      >
        {tabContent}
      </InstrumentDrawer>

      <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-[12] w-full max-w-3xl px-6 pointer-events-none">
        <div className="pointer-events-auto">
          <DesktopNowPlayingFooter
            isPlaying={isPlaying}
            isStarting={isStarting}
            statusLine={playbackStatusLine}
            onTogglePlay={togglePlay}
            onOpenAudioLab={onOpenAudioLab}
            paletteColors={params.colorPalette}
            onOpenPalettes={onOpenPalettes}
            sessionProgress={sessionProgress}
            sessionDurationMinutes={sessionDurationPick}
          />
        </div>
      </div>

      <MobileInstrumentDock
        isPlaying={isPlaying}
        isStarting={isStarting}
        statusLine={playbackStatusLine}
        onTogglePlay={togglePlay}
        onOpenAudioLab={onOpenAudioLab}
        onOpenDrawer={onOpenDrawer}
        mainTab={mainTab}
        onTabChange={onMainTabChange}
        paletteColors={params.colorPalette}
        onOpenPalettes={onOpenPalettes}
        sessionProgress={sessionProgress}
        prefersReducedMotion={prefersReducedMotion}
      />

      {sharedModals}
    </div>
  );
}
