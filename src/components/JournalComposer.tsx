import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { VS, scrimClass, SURFACE, TYPE } from "../constants/visual-system";
import { MOTION } from "../lib/instrument/motion-system";
import { cx } from "../lib/cx";

type JournalComposerProps = {
  open: boolean;
  value: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function JournalComposer({
  open,
  value,
  isSaving,
  onChange,
  onClose,
  onSave,
}: JournalComposerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Journal Space"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MOTION.surface.hint}
          className={cx(scrimClass("soft"), "fixed inset-0 z-[100] flex justify-end text-eq-ink selection:bg-eq-glow/25")}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={MOTION.surface.drawer}
            onMouseDown={(e) => e.stopPropagation()}
            className={cx(
              "relative z-10 flex h-full w-full max-w-lg flex-col border-l border-eq-glow/15",
              SURFACE.float.bg,
              SURFACE.float.shadow,
            )}
          >
            <div
              className={cx(
                "flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4",
                SURFACE.scrim.soft.bg,
              )}
            >
              <h2 className="font-serif text-xl font-light text-eq-glow/90 tracking-wide md:text-2xl">Journal Space</h2>
              <button
                type="button"
                onClick={onClose}
                className={cx(
                  "rounded-full px-4 py-2 transition-colors",
                  SURFACE.base.bg,
                  SURFACE.base.border,
                  SURFACE.base.interactive,
                  TYPE.eyebrow,
                  "tracking-[0.22em] text-white/55 hover:text-eq-ink hover:border-eq-glow/35",
                )}
              >
                Close
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-5 py-6">
              <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Empty your mind here..."
                className="min-h-[40vh] w-full flex-1 resize-none bg-transparent font-serif text-2xl font-light text-eq-ink/85 outline-none placeholder:text-white/25 md:text-3xl lg:text-4xl"
                autoFocus
              />
              <div className="mt-6 flex justify-end pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!value.trim() || isSaving}
                  className={cx(
                    VS.pillAccent,
                    "px-8 py-3 text-base disabled:cursor-not-allowed disabled:opacity-30",
                  )}
                >
                  {isSaving ? "Preserving..." : "Save Entry"}
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
