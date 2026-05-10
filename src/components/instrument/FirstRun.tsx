import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, X } from "lucide-react";
import { MOTION, withReducedMotion } from "../../lib/instrument/motion-system";
import { SURFACE, TYPE } from "../../constants/visual-system";
import { cx } from "../../lib/cx";

const FIRST_RUN_KEY = "equilibrium.firstRun.completed";
export const REFLECT_CRISIS_SUPPORT_URL = "https://988lifeline.org/";

export type FirstRunStep = {
  /** Eyebrow label. */
  eyebrow: string;
  /** Headline (serif). */
  title: string;
  /** Single-sentence body. */
  body: string;
  /** Optional CTA label that advances. Defaults to "Continue". */
  ctaLabel?: string;
};

const STEPS: FirstRunStep[] = [
  {
    eyebrow: "Step 1 of 3",
    title: "This is the breath.",
    body: "Move your cursor over the stage. Drag to nudge motion left and right, brightness up and down. The sound will follow.",
    ctaLabel: "I see it",
  },
  {
    eyebrow: "Step 2 of 3",
    title: "This is your voice.",
    body: "When words feel right, press M to open the compose drawer. A short sentence shapes the soundscape; you don't need to be precise.",
    ctaLabel: "Continue",
  },
  {
    eyebrow: "Step 3 of 3",
    title: "This is your time.",
    body:
      "Open Session in the drawer (or tabs in form mode) to pick a duration and intent. While audio plays, the timer shows on the bottom dock—a ring wraps play on phones; on wider screens you'll see remaining time on the playback bar.",
    ctaLabel: "Begin",
  },
];

export type FirstRunProps = {
  /** Force-open (used by the lab's "replay walkthrough" affordance). */
  forceOpen?: boolean;
  /** Called when the walkthrough finishes (last step Begin or Skip). */
  onComplete?: () => void;
  prefersReducedMotion: boolean;
};

export function readFirstRunCompleted(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeFirstRunCompleted(value: boolean): void {
  try {
    localStorage.setItem(FIRST_RUN_KEY, value ? "true" : "false");
  } catch {
    /* private mode */
  }
}

export function FirstRun({ forceOpen, onComplete, prefersReducedMotion }: FirstRunProps) {
  const [open, setOpen] = useState<boolean>(() => forceOpen ?? !readFirstRunCompleted());
  const [stepIdx, setStepIdx] = useState(0);
  const transition = withReducedMotion(MOTION.surface.modal, prefersReducedMotion);

  useEffect(() => {
    if (forceOpen === true) {
      setOpen(true);
      setStepIdx(0);
    }
  }, [forceOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") complete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const advance = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      complete();
    }
  };

  const complete = () => {
    setOpen(false);
    setStepIdx(0);
    writeFirstRunCompleted(true);
    onComplete?.();
  };

  const step = STEPS[stepIdx];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="first-run"
          role="dialog"
          aria-modal="true"
          aria-label="First run walkthrough"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          // Keep the stage breathing through — only a soft dim.
          className="fixed inset-0 z-[150] flex items-end md:items-center justify-center px-5 pb-32 md:pb-0 bg-eq-void/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={transition}
            className={cx(
              "relative max-w-md w-full p-7 rounded-3xl",
              "border border-eq-glow/22 bg-eq-void/82 backdrop-blur-2xl",
              "shadow-[0_28px_80px_-40px_rgba(0,0,0,0.95)]",
            )}
          >
            <button
              type="button"
              onClick={complete}
              aria-label="Skip walkthrough"
              className={cx(
                "absolute top-3 right-3 rounded-full p-2 transition-colors",
                SURFACE.base.interactive,
                SURFACE.base.bg,
                "text-white/55 hover:text-eq-ink",
              )}
            >
              <X className="w-4 h-4" aria-hidden />
            </button>

            <span className={cx(TYPE.eyebrow, "text-eq-glow/80")}>{step.eyebrow}</span>
            <h2 className={cx(TYPE.heading, "mt-3")}>{step.title}</h2>
            <p className="mt-4 text-sm font-light text-white/70 leading-relaxed">{step.body}</p>

            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5" aria-hidden>
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={cx(
                      "h-1.5 rounded-full transition-all duration-500",
                      i === stepIdx ? "w-6 bg-eq-glow/85" : "w-1.5 bg-white/15",
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={advance}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-eq-glow/35 bg-eq-glow/[0.10] text-[11px] font-medium uppercase tracking-[0.2em] text-eq-glow/95 hover:bg-eq-glow/[0.16] transition-colors"
              >
                {step.ctaLabel ?? "Continue"}
                <ChevronRight className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>

            {stepIdx === STEPS.length - 1 ? (
              <p className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-white/45 font-light leading-relaxed">
                If you may be in crisis, pause audio and reach out —{" "}
                <a
                  href={REFLECT_CRISIS_SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-eq-danger/85 underline underline-offset-4 hover:text-eq-danger"
                >
                  988 Suicide &amp; Crisis Lifeline (US)
                </a>
                .
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
