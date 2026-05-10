import React from "react";
import { motion } from "motion/react";
import { VS, SURFACE, TYPE, surfaceClass } from "../constants/visual-system";
import { cx } from "../lib/cx";

export const REFLECT_CRISIS_SUPPORT_URL = "https://988lifeline.org/";

export type ReflectViewProps = {
  onLeaveFeedback: () => void;
  onJournal: () => void;
  onHistory: () => void;
};

export function ReflectView({ onLeaveFeedback, onJournal, onHistory }: ReflectViewProps) {
  return (
    <div className="max-w-lg mx-auto w-full space-y-7 px-2 py-6">
      <div className="text-center space-y-3">
        <p className={cx(TYPE.eyebrow, "text-center mb-0 text-eq-glow/70 tracking-[0.32em]")}>Reflect</p>
        <p className={cx(TYPE.subheading, "text-center max-w-md mx-auto text-white/52 font-light leading-relaxed")}>
          Brief feedback after listening helps tailor future soundscapes. Journaling is optional depth — never required
          to press play.
        </p>
        <div className="mx-auto h-px w-12 bg-gradient-to-r from-transparent via-eq-copper/40 to-transparent" aria-hidden />
      </div>

      <div className={cx(surfaceClass(SURFACE.raised, "rounded-[1.25rem]"), "p-5 backdrop-blur-xl")}>
        <div className="flex flex-wrap gap-2 justify-center">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onLeaveFeedback}
            className={cx(VS.pillAccent, "px-5 py-2.5")}
          >
            Leave feedback
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onJournal} className={cx(VS.pillGhost, "px-5 py-2.5")}>
            Journal
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onHistory} className={cx(VS.pillGhost, "px-5 py-2.5")}>
            History
          </motion.button>
        </div>
      </div>

      <a
        href={REFLECT_CRISIS_SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs text-eq-danger/90 underline underline-offset-4 font-light hover:text-eq-danger transition-colors"
      >
        If you may be in crisis, pause audio and reach out — 988 Suicide & Crisis Lifeline (US).
      </a>
    </div>
  );
}
