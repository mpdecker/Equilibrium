import React, { useId } from "react";
import { motion } from "motion/react";
import { TYPE } from "../constants/visual-system";
import { cx } from "../lib/cx";

export type ParamSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

export function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => v.toString(),
}: ParamSliderProps) {
  const sliderId = useId();
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-white/70">
        <label htmlFor={sliderId}>{label}</label>
        <span className={cx(TYPE.numeric, "opacity-95")}>{format(value)}</span>
      </div>
      <motion.input
        id={sliderId}
        whileHover={{ opacity: 1 }}
        whileTap={{ scale: 1.02 }}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full bg-eq-glow/15 active:bg-eq-glow/25 h-1.5 rounded-full appearance-none outline-none cursor-pointer opacity-90 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-eq-glow [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(199,160,58,0.55)] hover:[&::-webkit-slider-thumb]:scale-150 active:[&::-webkit-slider-thumb]:scale-[1.75] active:[&::-webkit-slider-thumb]:shadow-[0_0_14px_rgba(199,160,58,0.85)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200"
      />
    </div>
  );
}
