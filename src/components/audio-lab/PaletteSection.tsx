import React from "react";
import { SectionTitle } from "../ui/surface";
import { TYPE } from "../../constants/visual-system";
import { cx } from "../../lib/cx";

export type PaletteSectionProps = {
  colorPalettePreview: string[];
  onOpenPalettes: () => void;
};

export function PaletteSection({ colorPalettePreview, onOpenPalettes }: PaletteSectionProps) {
  return (
    <div>
      <SectionTitle>Palette</SectionTitle>
      <p className={cx(TYPE.subheadingMuted, "text-xs mb-3")}>Visual atmosphere tied to tone presets.</p>
      <button
        type="button"
        onClick={onOpenPalettes}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-eq-glow/20 bg-eq-glow/[0.06] px-4 py-3 hover:bg-eq-glow/[0.12] transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        title="Browse color palettes"
      >
        <span className="text-sm font-light text-white/85">Browse palettes</span>
        <div className="flex gap-1.5">
          {colorPalettePreview.map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </button>
    </div>
  );
}
