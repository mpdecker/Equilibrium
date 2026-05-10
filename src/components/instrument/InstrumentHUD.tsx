import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { MOTION, withReducedMotion } from "../../lib/instrument/motion-system";
import { TYPE } from "../../constants/visual-system";

export type InstrumentHUDProps = {
  /** Current intensity macro 0..1. */
  intensity: number;
  /** Current brightness macro 0..1. */
  brightness: number;
  /** Display name of the active palette. */
  paletteName: string;
  /** Whether the HUD should be visible. */
  visible: boolean;
  /** Auto-hide is governed by the parent; reduce-motion bypasses transitions. */
  prefersReducedMotion: boolean;
  /** Optional anchor (clientX/clientY in pixels). When omitted, HUD is centered top. */
  anchor?: { x: number; y: number };
};

/**
 * Minimal hover-revealed readout for the instrument stage.
 * Shows current macros without ever taking pointer/keyboard focus.
 *
 * The HUD is intentionally non-interactive — pointer-events are off.
 * Touch interaction with the HUD is handled by the surrounding shell, not here.
 */
export function InstrumentHUD({
  intensity,
  brightness,
  paletteName,
  visible,
  prefersReducedMotion,
  anchor,
}: InstrumentHUDProps) {
  const transition = withReducedMotion(MOTION.surface.hint, prefersReducedMotion);

  const positionStyle: React.CSSProperties = anchor
    ? {
        position: "fixed",
        left: Math.max(12, Math.min(anchor.x + 16, window.innerWidth - 220)),
        top: Math.max(12, anchor.y - 56),
        pointerEvents: "none",
      }
    : {
        position: "fixed",
        left: "50%",
        top: 24,
        transform: "translateX(-50%)",
        pointerEvents: "none",
      };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="instrument-hud"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={transition}
          style={positionStyle}
          className="z-[60] select-none"
          aria-hidden
        >
          <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-eq-void/72 backdrop-blur-xl px-4 py-2 shadow-[0_18px_44px_-30px_rgba(0,0,0,0.95)]">
            <ReadoutCell label="Intensity" value={intensity} />
            <span className="h-3 w-px bg-white/[0.12]" />
            <ReadoutCell label="Brightness" value={brightness} />
            <span className="h-3 w-px bg-white/[0.12]" />
            <span className={TYPE.numeric + " text-eq-glow/90 uppercase tracking-[0.22em]"}>
              {paletteName}
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ReadoutCell({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/45">{label}</span>
      <span className={TYPE.numeric}>{String(pct).padStart(2, "0")}</span>
    </div>
  );
}
