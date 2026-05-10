import React from "react";
import { motion } from "motion/react";
import { Settings2, Wind } from "lucide-react";
import { VS, SURFACE, TYPE, surfaceClass, selectedSurfaceClass } from "../constants/visual-system";
import { cx } from "../lib/cx";

export type AppHeaderProps = {
  netOnline: boolean;
  outboxPending: number;
  outboxSyncing: boolean;
  showJournal: boolean;
  showAudioLab: boolean;
  onWrite: () => void;
  onToggleJournal: () => void;
  onOpenAudioLab: () => void;
};

export function AppHeader({
  netOnline,
  outboxPending,
  outboxSyncing,
  showJournal,
  showAudioLab,
  onWrite,
  onToggleJournal,
  onOpenAudioLab,
}: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-10 md:mb-12 relative z-50">
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center gap-3">
          <span
            className={cx(
              surfaceClass(SURFACE.raised, "flex h-10 w-10 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"),
            )}
          >
            <Wind className="w-5 h-5 text-eq-glow/90" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={cx(TYPE.eyebrow, "pl-0 mb-1 tracking-[0.35em] text-eq-glow/80")}>Instrument</p>
            <h1 className="text-lg md:text-xl font-serif font-light tracking-[0.45em] text-eq-ink/95">
              EQUILIBRIUM
            </h1>
          </div>
        </div>
        {!netOnline || outboxPending > 0 || outboxSyncing ? (
          <p className="text-[10px] text-amber-200/65 tracking-wide max-w-md leading-relaxed border-l border-eq-glow/30 pl-4 ml-[3.25rem]">
            {!netOnline ? "Offline — playback uses your last saved soundscape. " : ""}
            {outboxSyncing ? "Syncing queued notes… " : ""}
            {netOnline && !outboxSyncing && outboxPending > 0
              ? `${outboxPending} entr${outboxPending === 1 ? "y" : "ies"} waiting to sync.`
              : ""}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end z-50">
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onWrite}
          className={cx(VS.pillAccent, "px-5 py-2.5")}
        >
          Write
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onToggleJournal}
          className={cx(
            VS.pillGhost,
            "px-5 py-2.5",
            showJournal && "border-eq-glow/35 bg-eq-glow/[0.08] text-eq-ink",
          )}
        >
          History
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onOpenAudioLab}
          className={cx(
            "p-2.5 rounded-full transition-all shadow-[0_0_20px_-10px_rgba(199,160,58,0.5)]",
            showAudioLab
              ? cx(selectedSurfaceClass(), "text-eq-ink border-eq-glow/40")
              : cx(surfaceClass(SURFACE.raised, "rounded-full"), SURFACE.raised.interactive, "text-white/75"),
          )}
          aria-label="Open audio lab"
        >
          <Settings2 className="w-5 h-5 opacity-90" aria-hidden />
        </motion.button>
      </div>
    </header>
  );
}
