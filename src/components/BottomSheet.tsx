import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TYPE, scrimClass, SURFACE } from "../constants/visual-system";
import { cx } from "../lib/cx";

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Tall sheets scroll inside */
  maxHeight?: string;
};

export function BottomSheet({ open, title, onClose, children, maxHeight = "85vh" }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>("button.sheet-close")?.focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      previous?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cx(scrimClass("soft"), "fixed inset-0 z-[120] flex flex-col justify-end")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className={cx(
              SURFACE.float.bg,
              SURFACE.float.border,
              SURFACE.float.shadow,
              "mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] text-eq-ink ring-1 ring-eq-glow/10",
            )}
            style={{ maxHeight }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0 border-b border-white/[0.06] bg-eq-field/40">
              <h2 id="bottom-sheet-title" className={cx(TYPE.eyebrow, "text-eq-glow/85 tracking-[0.28em]")}>
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="sheet-close text-[10px] font-medium uppercase tracking-wider text-white/50 hover:text-eq-ink px-3 py-1.5 rounded-full border border-eq-glow/25 bg-eq-glow/[0.08] hover:bg-eq-glow/[0.14] transition-colors"
              >
                Done
              </button>
            </div>
            <div
              className="overflow-y-auto px-5 py-4 pb-8 no-scrollbar flex-1 min-h-0"
              aria-labelledby="bottom-sheet-title"
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
