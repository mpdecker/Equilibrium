import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { MOTION, withReducedMotion } from "../../lib/instrument/motion-system";
import { cx } from "../../lib/cx";
import { VS } from "../../constants/visual-system";

export type InstrumentDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Render the active tab's content. */
  children: React.ReactNode;
  /** Optional title shown at the top of the drawer header. */
  title?: string;
  /** Optional row under title (e.g. journey strip). */
  trail?: React.ReactNode;
  /** Tab strip rendered above the content (e.g. PrimaryNavigation). */
  tabs?: React.ReactNode;
  prefersReducedMotion: boolean;
  /** When true, expose an edge-trigger affordance even while closed. */
  showEdgeTrigger?: boolean;
};

/**
 * Right-side slide-out drawer for the instrument shell.
 *
 * - Hidden by default (instrument is the dominant surface).
 * - Opens on edge-hover handle, header button, `M` keyboard shortcut, or focus
 *   intent (e.g. autoOpen when mood input requested).
 * - Does NOT trap focus or dim the stage — you should still see the
 *   instrument breathing behind it.
 * - On mobile the drawer becomes full-width below md breakpoint.
 */
export function InstrumentDrawer({
  open,
  onOpenChange,
  children,
  title = "Compose",
  trail,
  tabs,
  prefersReducedMotion,
  showEdgeTrigger = true,
}: InstrumentDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const transition = withReducedMotion(MOTION.surface.drawer, prefersReducedMotion);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName.toLowerCase();
        // Don't intercept Escape inside text inputs — they may have their own behavior.
        if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {/* Edge trigger — visible only when drawer is closed (desktop) */}
      {showEdgeTrigger && !open ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open compose drawer"
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-[55] items-center justify-center w-7 h-20 rounded-l-2xl border border-r-0 border-white/[0.1] bg-eq-void/70 backdrop-blur-xl text-eq-glow/80 hover:bg-eq-void/85 hover:text-eq-glow transition-colors shadow-[-12px_0_30px_-20px_rgba(0,0,0,0.7)]"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
        </button>
      ) : null}

      <AnimatePresence>
        {open ? (
          <motion.aside
            key="instrument-drawer"
            ref={drawerRef}
            role="complementary"
            aria-label="Instrument drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={transition}
            className={cx(
              "fixed right-0 top-0 bottom-0 z-[58] w-full md:w-[420px] flex flex-col",
              "bg-eq-void/82 backdrop-blur-2xl border-l border-white/[0.08]",
              "shadow-[-32px_0_80px_-40px_rgba(0,0,0,0.95)]",
            )}
          >
            <header className="flex flex-col gap-3 px-5 pt-5 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cx(VS.label, "text-eq-glow/80 mb-0")}>{title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close drawer"
                  className="p-2 rounded-full border border-white/[0.08] hover:border-eq-glow/30 text-white/65 hover:text-eq-ink transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>
              {trail ? <div className="pb-1">{trail}</div> : null}
            </header>

            {tabs ? <div className="px-4 pt-3 pb-1 border-b border-white/[0.04]">{tabs}</div> : null}

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-4">
              {children}
            </div>

            <footer className="px-4 py-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-[10px] uppercase tracking-[0.22em] text-white/45 hover:text-eq-glow/80 transition-colors inline-flex items-center gap-1"
              >
                <ChevronRight className="w-3 h-3" aria-hidden />
                Hide drawer
              </button>
            </footer>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
