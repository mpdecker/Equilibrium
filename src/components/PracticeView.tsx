import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Mic2, Timer, X } from "lucide-react";
import { QUICK_MOODS } from "../constants/quick-moods";
import { VS, SURFACE, TYPE, surfaceClass } from "../constants/visual-system";
import { cx } from "../lib/cx";

export type PracticeViewProps = {
  isPlaying: boolean;
  isAnalyzing: boolean;
  moodInput: string;
  explainLine: string | null;
  dynamicPrompt: { question: string; options: string[] } | null;
  showFeedbackPrompt: boolean;
  onMoodInputChange: (value: string) => void;
  onMoodSubmit: (e: React.FormEvent) => void;
  onQuickMood: (mood: string) => void;
  /** Feedback / pulse prompt options use the interaction recording path. */
  onFeedbackOption: (option: string) => void;
  /** One-shot nudge after a successful compose while audio is playing. */
  sessionNudgeVisible?: boolean;
  onDismissSessionNudge?: () => void;
  onOpenSessionFromNudge?: () => void;
};

export function PracticeView({
  isPlaying,
  isAnalyzing,
  moodInput,
  explainLine,
  dynamicPrompt,
  showFeedbackPrompt,
  onMoodInputChange,
  onMoodSubmit,
  onQuickMood,
  onFeedbackOption,
  sessionNudgeVisible = false,
  onDismissSessionNudge,
  onOpenSessionFromNudge,
}: PracticeViewProps) {
  return (
    <>
      <div className="text-center mb-8 md:mb-12 space-y-5 px-1">
        <p className={cx(TYPE.eyebrow, "text-center mb-0 tracking-[0.35em] text-eq-glow/70")}>Practice</p>
        <h2 className={cx(TYPE.display, "text-center")}>
          {isPlaying ? "Breathing into the present." : "A canvas for your interior state."}
        </h2>
        <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-eq-glow/50 to-transparent" aria-hidden />
        <p className={cx(TYPE.subheadingMuted, "text-white/48 md:text-base max-w-lg mx-auto text-center")}>
          Express your current mood, stress level, or recent activity. The generative engine will synthesize an ambient
          soundscape to help you reach emotional equilibrium.
        </p>
      </div>

      <div className="max-w-xl mx-auto w-full relative px-1">
        <p className={cx(TYPE.eyebrow, "text-center mb-3")}>Quick check-ins</p>
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {QUICK_MOODS.map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={isAnalyzing}
              onClick={() => onQuickMood(q.mood)}
              className={cx(
                "px-3.5 py-1.5 text-[11px] rounded-full transition-all border text-white/65 hover:border-eq-glow/35 hover:bg-eq-glow/[0.08] hover:text-eq-ink disabled:opacity-40",
                SURFACE.base.bg,
                SURFACE.base.border,
                SURFACE.base.interactive,
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
        {explainLine ? (
          <p className={cx(TYPE.subheadingMuted, "text-center mb-6 px-2 border-l border-eq-glow/25 pl-4 ml-2 mr-2")}>
            {explainLine}
          </p>
        ) : null}
        <AnimatePresence>
          {sessionNudgeVisible && onDismissSessionNudge && onOpenSessionFromNudge ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={cx(
                surfaceClass(SURFACE.raised, "rounded-[1.25rem]"),
                "relative mb-4 p-4 backdrop-blur-xl border-eq-glow/22 flex flex-col sm:flex-row sm:items-center gap-3",
              )}
            >
              <div className="flex items-start gap-3 flex-1 text-left">
                <Timer className="w-5 h-5 text-eq-glow/85 shrink-0 mt-0.5" aria-hidden />
                <p className="text-sm font-light text-white/72 leading-snug">
                  Hold this sound in time — try a short guided session when you are ready.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onOpenSessionFromNudge}
                  className={cx(VS.pillAccent, "px-4 py-2 text-[11px]")}
                >
                  Open session
                </button>
                <button
                  type="button"
                  onClick={onDismissSessionNudge}
                  aria-label="Dismiss session suggestion"
                  className={cx(
                    "shrink-0 p-2 rounded-full transition-colors",
                    SURFACE.base.bg,
                    SURFACE.base.border,
                    "text-white/45 hover:text-white/85",
                    SURFACE.base.interactive,
                  )}
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <form onSubmit={onMoodSubmit} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-eq-glow/12 via-white/8 to-eq-copper/10 rounded-[1.35rem] blur-md opacity-40 group-hover:opacity-70 transition duration-1000 group-hover:duration-300" />
          <motion.div
            animate={{
              scale: isAnalyzing ? 0.985 : moodInput.trim() ? 1.008 : 1,
              borderColor: isAnalyzing
                ? "rgba(255, 255, 255, 0.06)"
                : moodInput.trim()
                  ? "rgba(199, 160, 58, 0.35)"
                  : "rgba(255, 255, 255, 0.11)",
              boxShadow:
                moodInput.trim() && !isAnalyzing
                  ? "0 10px 40px -24px rgba(199, 160, 58, 0.35), inset 0 1px 0 0 rgba(255,255,255,0.08)"
                  : "0 12px 40px -28px rgba(0, 0, 0, 0.65), inset 0 1px 0 0 rgba(255,255,255,0.05)",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="relative flex items-center bg-eq-field/85 backdrop-blur-xl rounded-[1.25rem] p-2 shadow-2xl border border-white/[0.1]"
          >
            <input
              id="mood-input"
              type="text"
              value={moodInput}
              onChange={(e) => onMoodInputChange(e.target.value)}
              placeholder="I am feeling overwhelmed with work today..."
              className="flex-1 bg-transparent text-eq-ink placeholder-white/28 px-6 py-4 outline-none font-light text-lg transition-colors"
              disabled={isAnalyzing}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                backgroundColor: moodInput.trim() ? "rgba(199, 160, 58, 0.18)" : "rgba(255,255,255,0.06)",
                opacity: isAnalyzing ? 0.5 : 1,
              }}
              transition={{ duration: 0.3 }}
              type="submit"
              disabled={!moodInput.trim() || isAnalyzing}
              className={cx(
                "p-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[56px] border",
                SURFACE.base.border,
              )}
            >
              {isAnalyzing ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Sparkles className="w-6 h-6 text-eq-glow/80" />
                </motion.div>
              ) : (
                <Mic2 className="w-6 h-6 text-eq-glow/95" />
              )}
            </motion.button>
          </motion.div>
        </form>

        <AnimatePresence>
          {showFeedbackPrompt ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cx(
                surfaceClass(SURFACE.raised, "rounded-[1.25rem]"),
                "absolute mt-6 left-0 right-0 p-4 backdrop-blur-xl border-eq-glow/15 shadow-[0_20px_50px_-34px_rgba(0,0,0,0.85)]",
              )}
            >
              <p className="text-sm text-center text-white/72 mb-3 font-light">
                {dynamicPrompt ? dynamicPrompt.question : "How is this soundscape resonating with you right now?"}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {(dynamicPrompt?.options || ["It helps", "Too intense", "Need uplifting"]).map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onFeedbackOption(opt)}
                    className="px-4 py-2 text-xs rounded-full border border-eq-glow/28 bg-eq-glow/[0.07] text-eq-ink/90 hover:bg-eq-glow/[0.14] transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
