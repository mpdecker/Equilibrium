import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Square, ChevronUp, ChevronDown, SlidersHorizontal, Sparkles, Timer, BookOpen } from "lucide-react";
import { MOTION, withReducedMotion } from "../../lib/instrument/motion-system";
import { cx } from "../../lib/cx";
import type { PrimaryTabId } from "../PrimaryNavigation";
import { SessionRingOverlay } from "../NowPlayingDock";

export type MobileInstrumentDockProps = {
  isPlaying: boolean;
  isStarting: boolean;
  statusLine: string;
  onTogglePlay: () => void;
  onOpenAudioLab: () => void;
  /** Open the right-side compose drawer (mobile renders it as full-width). */
  onOpenDrawer: () => void;
  mainTab: PrimaryTabId;
  onTabChange: (id: PrimaryTabId) => void;
  paletteColors: string[];
  onOpenPalettes: () => void;
  /** Optional session progress 0..1 to draw a ring around the play button. */
  sessionProgress?: number | null;
  prefersReducedMotion: boolean;
};

const TABS: ReadonlyArray<readonly [PrimaryTabId, string, React.ComponentType<{ className?: string }>]> = [
  ["practice", "Practice", Sparkles],
  ["session", "Session", Timer],
  ["reflect", "Reflect", BookOpen],
];

/**
 * Single adaptive bottom dock for mobile that replaces the stacked
 * `MobileNowPlayingBar` + `MobilePrimaryNav` chrome.
 *
 * - Collapsed (default): a thin pill showing status + play/pause + an "expand" handle.
 * - Expanded (tap or swipe-up): tab nav, palette dots, and lab handle slide up.
 * - The collapsed footprint is ~4.5rem; expanded is ~9rem (vs. ~9.5rem stacked previously).
 */
export function MobileInstrumentDock({
  isPlaying,
  isStarting,
  statusLine,
  onTogglePlay,
  onOpenAudioLab,
  onOpenDrawer,
  mainTab,
  onTabChange,
  paletteColors,
  onOpenPalettes,
  sessionProgress,
  prefersReducedMotion,
}: MobileInstrumentDockProps) {
  const [expanded, setExpanded] = useState(false);
  const transition = withReducedMotion(MOTION.surface.drawer, prefersReducedMotion);
  const showProgress = typeof sessionProgress === "number" && sessionProgress >= 0 && sessionProgress <= 1;

  return (
    <div
      className="md:hidden fixed left-0 right-0 z-[110]"
      style={{ bottom: "max(0px, env(safe-area-inset-bottom))" }}
    >
      <motion.div
        layout
        transition={transition}
        className="mx-3 mb-3 rounded-2xl border border-white/[0.08] bg-eq-void/92 backdrop-blur-2xl shadow-[0_-12px_50px_-18px_rgba(0,0,0,0.92)] overflow-hidden"
      >
        {/* Collapsed bar */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">Now</p>
            <p className="text-[11px] text-white/82 font-light truncate leading-snug">{statusLine}</p>
          </div>

          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Open compose"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.08] text-white/70 hover:text-eq-glow transition-colors"
          >
            <Sparkles className="w-4 h-4" aria-hidden />
          </button>

          <PlayButton
            isPlaying={isPlaying}
            isStarting={isStarting}
            onTogglePlay={onTogglePlay}
            sessionProgress={showProgress ? sessionProgress! : null}
          />

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse dock" : "Expand dock"}
            aria-expanded={expanded}
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.08] text-white/55 hover:text-eq-ink transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" aria-hidden />
            ) : (
              <ChevronUp className="w-4 h-4" aria-hidden />
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="dock-expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={transition}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-white/[0.05] space-y-3">
                {/* Tabs */}
                <nav aria-label="Primary" className="flex gap-1">
                  {TABS.map(([id, label, Icon]) => {
                    const active = id === mainTab;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          onTabChange(id);
                          onOpenDrawer();
                        }}
                        className={cx(
                          "flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border text-[10px] uppercase tracking-[0.16em] transition-colors",
                          active
                            ? "border-eq-glow/35 bg-eq-glow/[0.10] text-eq-glow"
                            : "border-white/[0.06] bg-white/[0.02] text-white/55 hover:text-white/80",
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" aria-hidden />
                        {label}
                      </button>
                    );
                  })}
                </nav>

                {/* Palette dots + lab */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onOpenPalettes}
                    aria-label="Change color palette"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-white/[0.08] hover:border-eq-glow/35 hover:bg-eq-glow/[0.05] transition-colors"
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/50">
                      Palette
                    </span>
                    <span className="flex gap-1">
                      {paletteColors.map((c, i) => (
                        <span
                          key={i}
                          className="w-3 h-3 rounded-full border border-white/30 ring-1 ring-black/30"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenAudioLab}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-eq-glow/25 bg-eq-glow/[0.08] text-[10px] uppercase tracking-[0.18em] text-eq-glow/95 hover:bg-eq-glow/[0.13] transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
                    Lab
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function PlayButton({
  isPlaying,
  isStarting,
  onTogglePlay,
  sessionProgress,
}: {
  isPlaying: boolean;
  isStarting: boolean;
  onTogglePlay: () => void;
  sessionProgress: number | null;
}) {
  return (
    <div className="relative shrink-0">
      {sessionProgress !== null ? (
        <SessionRingOverlay
          progress={sessionProgress}
          testId="session-ring"
          className="absolute inset-0 -m-0.5 w-[3.25rem] h-[3.25rem] pointer-events-none"
        />
      ) : null}
      <motion.button
        type="button"
        whileTap={{ scale: isStarting ? 1 : 0.95 }}
        onClick={onTogglePlay}
        disabled={isStarting}
        aria-label={isPlaying ? "Pause" : "Play"}
        className={cx(
          "shrink-0 w-12 h-12 rounded-full border flex items-center justify-center transition-all",
          isStarting
            ? "border-white/10 opacity-50"
            : "border-eq-glow/35 bg-gradient-to-br from-white/10 to-black/40 shadow-[0_0_24px_-10px_rgba(199,160,58,0.5)]",
        )}
      >
        {isStarting ? (
          <div className="w-5 h-5 border-2 border-t-eq-glow border-r-eq-glow border-b-transparent border-l-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Square className="w-5 h-5 text-eq-ink/90 fill-current" aria-hidden />
        ) : (
          <Play className="w-6 h-6 text-eq-glow/95 fill-current ml-0.5" aria-hidden />
        )}
      </motion.button>
    </div>
  );
}
