import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TYPE, scrimClass, SURFACE, surfaceClass } from "../constants/visual-system";
import { MOTION } from "../lib/instrument/motion-system";
import { cx } from "../lib/cx";

const SESSION_FEEDBACK_OPTIONS = ["Grounding", "Neutral", "Too intense"] as const;

type SessionCompleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelectFeedback: (feedback: string) => void;
  /** Jump to Reflect (and optionally open compose drawer upstream). */
  onReflect?: () => void;
  /** Open journaling flow (upstream opens composer). */
  onJournal?: () => void;
  /** Optional idle auto-dismiss (ms); keeps stage visible with light scrim. */
  autoDismissMs?: number;
};

export function SessionCompleteDialog({
  open,
  onClose,
  onSelectFeedback,
  onReflect,
  onJournal,
  autoDismissMs = 12_000,
}: SessionCompleteDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !autoDismissMs || autoDismissMs <= 0) return;
    const t = window.setTimeout(() => onClose(), autoDismissMs);
    return () => window.clearTimeout(t);
  }, [open, autoDismissMs, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Session complete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cx(scrimClass("soft"), "fixed inset-0 z-[130] flex items-center justify-center px-5")}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={MOTION.surface.modal}
            className={cx(
              surfaceClass(SURFACE.float, "rounded-[1.35rem]"),
              "max-w-md w-full space-y-6 border-eq-glow/20 p-8 ring-1 ring-eq-glow/10",
            )}
          >
            <h3 className={cx(TYPE.heading, "text-center text-xl tracking-wide")}>Session complete</h3>
            <p className={cx(TYPE.subheadingMuted, "text-center text-white/50")}>
              How was this held space for you?
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SESSION_FEEDBACK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelectFeedback(opt)}
                  className="px-4 py-2 text-xs rounded-full border border-eq-glow/28 bg-eq-glow/[0.08] text-eq-ink/90 hover:bg-eq-glow/[0.16] transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-center pt-1">
              {onReflect ? (
                <button
                  type="button"
                  onClick={onReflect}
                  className={cx(
                    "rounded-full px-5 py-2.5 text-xs transition-colors",
                    SURFACE.raised.bg,
                    SURFACE.raised.border,
                    SURFACE.raised.interactive,
                    "text-eq-ink/90",
                  )}
                >
                  Reflect on this session
                </button>
              ) : null}
              {onJournal ? (
                <button
                  type="button"
                  onClick={onJournal}
                  className={cx(
                    "rounded-full border border-transparent px-5 py-2.5 text-xs text-white/65 transition-colors hover:border-eq-glow/30 hover:text-eq-glow",
                    SURFACE.base.interactive,
                  )}
                >
                  Journal
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full pt-2 text-xs text-white/48 transition-colors hover:text-eq-glow/90"
            >
              Dismiss
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
