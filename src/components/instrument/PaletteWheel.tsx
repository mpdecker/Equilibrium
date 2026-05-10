import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ColorPaletteDef } from "../../constants/color-palettes";
import { COLOR_PALETTES } from "../../constants/color-palettes";
import { MOTION, withReducedMotion } from "../../lib/instrument/motion-system";

export type PaletteWheelProps = {
  /** Whether the wheel is open. */
  open: boolean;
  /** Anchor in viewport coordinates (px). When open, wheel centers on this. */
  anchor: { x: number; y: number } | null;
  /** Currently selected palette name (for highlighting). */
  selectedPaletteName?: string;
  onSelect: (palette: ColorPaletteDef) => void;
  onClose: () => void;
  prefersReducedMotion: boolean;
};

const RADIUS = 110;
const SWATCH = 56;

/**
 * Radial palette picker. Appears at the cursor on long-press; arranges palettes
 * around the touch/click point so they're equidistant from the gesture origin.
 *
 * Closes on:
 *  - selection
 *  - Escape
 *  - click outside the wheel
 *  - parent setting `open=false`
 */
export function PaletteWheel({
  open,
  anchor,
  selectedPaletteName,
  onSelect,
  onClose,
  prefersReducedMotion,
}: PaletteWheelProps) {
  const transition = withReducedMotion(MOTION.surface.modal, prefersReducedMotion);
  const wheelRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!wheelRef.current) return;
      if (!wheelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
    };
  }, [open, onClose]);

  if (!open || !anchor) {
    return (
      <AnimatePresence>{null}</AnimatePresence>
    );
  }

  const cx = clamp(anchor.x, RADIUS + SWATCH / 2 + 12, window.innerWidth - RADIUS - SWATCH / 2 - 12);
  const cy = clamp(anchor.y, RADIUS + SWATCH / 2 + 12, window.innerHeight - RADIUS - SWATCH / 2 - 12);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="palette-wheel"
          ref={wheelRef}
          role="dialog"
          aria-label="Color palettes"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={transition}
          style={{
            position: "fixed",
            left: cx - RADIUS - SWATCH / 2,
            top: cy - RADIUS - SWATCH / 2,
            width: RADIUS * 2 + SWATCH,
            height: RADIUS * 2 + SWATCH,
            zIndex: 70,
          }}
          className="select-none"
        >
          {/* Soft halo so the wheel reads against any background */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 55%, transparent 75%)",
              filter: "blur(2px)",
            }}
          />

          {/* Center label hub */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full border border-eq-glow/30 bg-eq-void/85 backdrop-blur-xl"
            style={{ pointerEvents: "none" }}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-eq-glow/85 tabular-nums">
              {hoveredIndex !== null ? COLOR_PALETTES[hoveredIndex].name : "Palette"}
            </span>
          </div>

          {COLOR_PALETTES.map((palette, i) => {
            const angle = (i / COLOR_PALETTES.length) * Math.PI * 2 - Math.PI / 2;
            const x = RADIUS + Math.cos(angle) * RADIUS;
            const y = RADIUS + Math.sin(angle) * RADIUS;
            const isSelected = palette.name === selectedPaletteName;
            return (
              <motion.button
                key={palette.name}
                type="button"
                onClick={() => onSelect(palette)}
                onPointerEnter={() => setHoveredIndex(i)}
                onPointerLeave={() =>
                  setHoveredIndex((curr) => (curr === i ? null : curr))
                }
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.94 }}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: SWATCH,
                  height: SWATCH,
                }}
                className={
                  "rounded-full border-2 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.85)] transition-colors " +
                  (isSelected
                    ? "border-eq-glow/85 ring-2 ring-eq-glow/30"
                    : "border-white/30 hover:border-eq-glow/60")
                }
                aria-label={`Select palette ${palette.name}`}
                aria-pressed={isSelected}
              >
                <span
                  className="block w-full h-full rounded-full"
                  style={{
                    background: `conic-gradient(from 0deg, ${palette.colors[0]}, ${palette.colors[1]}, ${palette.colors[2]}, ${palette.colors[0]})`,
                  }}
                />
              </motion.button>
            );
          })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
