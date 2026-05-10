import React from "react";
import { Sparkles, Timer, BookOpen } from "lucide-react";
import { cx } from "../lib/cx";
import { INSTRUMENT_TOKEN, SURFACE, scrimClass, selectedSurfaceClass } from "../constants/visual-system";

export const PRIMARY_TAB_DEFS = [
  ["practice", "Practice", Sparkles],
  ["session", "Session", Timer],
  ["reflect", "Reflect", BookOpen],
] as const;

export type PrimaryTabId = (typeof PRIMARY_TAB_DEFS)[number][0];

type DesktopPrimaryTabsProps = {
  mainTab: PrimaryTabId;
  onTabChange: (id: PrimaryTabId) => void;
};

export function DesktopPrimaryTabs({ mainTab, onTabChange }: DesktopPrimaryTabsProps) {
  return (
    <div className="hidden md:flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
      {PRIMARY_TAB_DEFS.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={cx(
            "shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-medium uppercase tracking-[0.18em] transition-all",
            mainTab === id
              ? selectedSurfaceClass()
              : cx(SURFACE.base.bg, SURFACE.base.border, SURFACE.base.interactive, "text-white/40 hover:text-white/75"),
          )}
        >
          <Icon className={cx("w-3.5 h-3.5", mainTab === id ? "text-eq-glow/90" : "opacity-60")} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

type MobilePrimaryNavProps = {
  mainTab: PrimaryTabId;
  onTabChange: (id: PrimaryTabId) => void;
};

export function MobilePrimaryNav({ mainTab, onTabChange }: MobilePrimaryNavProps) {
  return (
    <nav
      className={cx(
        scrimClass("dense"),
        INSTRUMENT_TOKEN.dividerClass,
        "md:hidden fixed bottom-0 left-0 right-0 z-[110] flex justify-around items-stretch pt-1.5 pb-[max(0.55rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-28px_rgba(0,0,0,0.85)]",
      )}
      aria-label="Primary"
    >
      {PRIMARY_TAB_DEFS.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={cx(
            "flex flex-1 flex-col items-center gap-0.5 px-2 py-1.5 text-[9px] font-medium uppercase tracking-[0.16em] transition-colors rounded-t-xl",
            mainTab === id ? "text-eq-glow" : "text-white/38",
          )}
        >
          <span
            className={cx(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
              mainTab === id
                ? selectedSurfaceClass()
                : "border border-transparent bg-transparent text-white/55",
            )}
          >
            <Icon className="w-[1.15rem] h-[1.15rem]" aria-hidden />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}
