import React from "react";
import type { PrimaryTabId } from "./PrimaryNavigation";
import { SURFACE, selectedSurfaceClass } from "../constants/visual-system";
import { cx } from "../lib/cx";

export type JourneyStepperProps = {
  activeTab: PrimaryTabId;
  /** Soft highlight on Session suggesting a natural next step after composing. */
  recommendSession?: boolean;
  onSelect: (id: PrimaryTabId) => void;
};

const STEPS: ReadonlyArray<readonly [PrimaryTabId, string]> = [
  ["practice", "Practice"],
  ["session", "Session"],
  ["reflect", "Reflect"],
];

export function JourneyStepper({ activeTab, recommendSession, onSelect }: JourneyStepperProps) {
  return (
    <nav aria-label="Journey" className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
      {STEPS.map(([id, label], idx) => {
        const active = activeTab === id;
        const rec = recommendSession && id === "session" && !active;
        return (
          <React.Fragment key={id}>
            {idx > 0 ? (
              <span className="text-[9px] font-mono text-white/20 select-none hidden sm:inline" aria-hidden>
                /
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onSelect(id)}
              className={cx(
                "relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] uppercase tracking-[0.16em] transition-colors",
                active
                  ? cx(selectedSurfaceClass(), "text-eq-glow")
                  : cx(SURFACE.base.bg, SURFACE.base.border, SURFACE.base.interactive, "text-white/45 hover:text-white/75"),
              )}
              aria-current={active ? "step" : undefined}
            >
              {label}
              {rec ? (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-eq-glow/85 shadow-[0_0_10px_-2px_rgba(199,160,58,0.8)]"
                  aria-hidden
                />
              ) : null}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
