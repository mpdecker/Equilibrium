import React from "react";
import { AnimatePresence } from "motion/react";
import { AmbientStage } from "../components/AmbientStage";
import { AppHeader } from "../components/AppHeader";
import { DesktopPrimaryTabs, MobilePrimaryNav, type PrimaryTabId } from "../components/PrimaryNavigation";
import { DesktopNowPlayingFooter, MobileNowPlayingBar } from "../components/NowPlayingDock";
import { JournalHistoryPanel } from "../components/JournalHistoryPanel";
import type { AmbientParams, EvolutionSettings } from "../lib/synth";
import type { EngineAnalyserLike } from "../lib/engine/types";
import type { JournalListItem } from "../lib/journal-merge";

export type FormAppLayoutProps = {
  sessionA11yTip: { id: number; msg: string };
  params: AmbientParams;
  settings: EvolutionSettings;
  isPlaying: boolean;
  prefersReducedMotion: boolean;
  analyser: EngineAnalyserLike | null;
  sharedModals: React.ReactNode;
  netOnline: boolean;
  outboxPending: number;
  outboxSyncing: boolean;
  showJournal: boolean;
  showAudioLab: boolean;
  onWrite: () => void;
  onToggleJournal: () => void;
  onOpenAudioLab: () => void;
  journals: JournalListItem[];
  journeyTrail: React.ReactNode;
  mainTab: PrimaryTabId;
  onMainTabChange: (id: PrimaryTabId) => void;
  tabContent: React.ReactNode;
  playbackStatusLine: string;
  isStarting: boolean;
  sessionProgress: number | null;
  sessionDurationPick: number;
  onTogglePlay: () => Promise<void>;
  onOpenPalettes: () => void;
};

export function FormAppLayout({
  sessionA11yTip,
  params,
  settings,
  isPlaying,
  prefersReducedMotion,
  analyser,
  sharedModals,
  netOnline,
  outboxPending,
  outboxSyncing,
  showJournal,
  showAudioLab,
  onWrite,
  onToggleJournal,
  onOpenAudioLab,
  journals,
  journeyTrail,
  mainTab,
  onMainTabChange,
  tabContent,
  playbackStatusLine,
  isStarting,
  sessionProgress,
  sessionDurationPick,
  onTogglePlay,
  onOpenPalettes,
}: FormAppLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-eq-void text-eq-ink selection:bg-eq-glow/20 font-sans">
      <p key={sessionA11yTip.id} className="sr-only" aria-live="polite" aria-atomic="true">
        {sessionA11yTip.msg}
      </p>
      <AmbientStage
        params={params}
        settings={settings}
        isPlaying={isPlaying}
        prefersReducedMotion={prefersReducedMotion}
        analyser={analyser}
      />

      {sharedModals}

      <div className="relative z-10 flex flex-col min-h-screen max-w-4xl mx-auto px-6 pt-6 md:p-12 pb-[calc(9.5rem+env(safe-area-inset-bottom))] md:pb-12 md:pt-14">
        <AppHeader
          netOnline={netOnline}
          outboxPending={outboxPending}
          outboxSyncing={outboxSyncing}
          showJournal={showJournal}
          showAudioLab={showAudioLab}
          onWrite={onWrite}
          onToggleJournal={onToggleJournal}
          onOpenAudioLab={onOpenAudioLab}
        />

        <AnimatePresence>{showJournal && <JournalHistoryPanel journals={journals} />}</AnimatePresence>

        <div className="mb-4 px-1">{journeyTrail}</div>

        <DesktopPrimaryTabs mainTab={mainTab} onTabChange={onMainTabChange} />

        <main
          className={`flex-1 flex flex-col min-h-0 ${
            mainTab === "practice" ? "justify-center" : "justify-start pt-2"
          } pb-2`}
        >
          {tabContent}
        </main>

        <DesktopNowPlayingFooter
          isPlaying={isPlaying}
          isStarting={isStarting}
          statusLine={playbackStatusLine}
          onTogglePlay={onTogglePlay}
          onOpenAudioLab={onOpenAudioLab}
          paletteColors={params.colorPalette}
          onOpenPalettes={onOpenPalettes}
          sessionProgress={sessionProgress}
          sessionDurationMinutes={sessionDurationPick}
        />

        <MobileNowPlayingBar
          isPlaying={isPlaying}
          isStarting={isStarting}
          statusLine={playbackStatusLine}
          onTogglePlay={onTogglePlay}
          onOpenAudioLab={onOpenAudioLab}
          sessionProgress={sessionProgress}
          sessionDurationMinutes={sessionDurationPick}
        />

        <MobilePrimaryNav mainTab={mainTab} onTabChange={onMainTabChange} />
      </div>
    </div>
  );
}
