import React from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ColorPaletteDef } from "../constants/color-palettes";
import { COLOR_PALETTES } from "../constants/color-palettes";
import { scrimClass, SURFACE, surfaceClass, TYPE } from "../constants/visual-system";
import { cx } from "../lib/cx";

type PaletteModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectPalette: (palette: ColorPaletteDef) => void;
};

export function PaletteModal({ open, onClose, onSelectPalette }: PaletteModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Color palettes"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cx(scrimClass("soft"), "fixed inset-0 z-[100] flex flex-col items-center justify-center text-eq-ink selection:bg-eq-glow/25")}
        >
          <div
            className="absolute inset-0 opacity-[0.14] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage:
                "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')",
            }}
          />

          <div
            className={cx(
              surfaceClass(SURFACE.float, "rounded-[1.35rem]"),
              "relative z-10 flex w-full max-w-lg flex-col space-y-8 p-7 ring-1 ring-eq-glow/10 md:p-8",
            )}
          >
            <div className="flex justify-between items-center gap-4">
              <h2 className={cx(TYPE.heading, "tracking-[0.35em] text-lg")}>PALETTES</h2>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/55 hover:text-eq-ink border border-eq-glow/25 rounded-full bg-eq-glow/[0.08] hover:bg-eq-glow/[0.14] transition-colors"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COLOR_PALETTES.map((palette) => (
                <motion.button
                  key={palette.name}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectPalette(palette)}
                  className={cx(
                    "flex flex-col rounded-2xl p-4 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all hover:border-eq-glow/30 hover:bg-eq-glow/[0.06]",
                    SURFACE.raised.bg,
                    SURFACE.raised.border,
                    SURFACE.raised.interactive,
                  )}
                >
                  <span className={cx(TYPE.eyebrow, "tracking-[0.22em] text-eq-glow/80 mb-3 normal-case")}>{palette.name}</span>
                  <div className="flex gap-3">
                    {palette.colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border border-white/25 shadow-inner ring-1 ring-black/25"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
