import React from "react";
import { motion } from "motion/react";
import type { SessionIntent } from "../lib/session-arc";
import { SURFACE, TYPE, selectedSurfaceClass, surfaceClass } from "../constants/visual-system";
import { cx } from "../lib/cx";
import { formatSessionClockLabels } from "../lib/session-clock";

export type SessionViewProps = {
  sessionIntentPick: SessionIntent;
  sessionDurationPick: number;
  sessionActive: boolean;
  isStarting: boolean;
  /** 0..1 from App while a timed session runs; drives elapsed / remaining UI. */
  sessionProgress?: number | null;
  onDurationPick: (minutes: number) => void;
  onIntentPick: (intent: SessionIntent) => void;
  onBeginSession: () => void;
  onEndSession: () => void;
};

export function SessionView({
  sessionIntentPick,
  sessionDurationPick,
  sessionActive,
  isStarting,
  sessionProgress = null,
  onDurationPick,
  onIntentPick,
  onBeginSession,
  onEndSession,
}: SessionViewProps) {
  const showClock =
    sessionActive &&
    typeof sessionProgress === "number" &&
    sessionProgress >= 0 &&
    sessionProgress <= 1;
  const clock = showClock ? formatSessionClockLabels(sessionProgress, sessionDurationPick) : null;

  return (
    <div className="max-w-md mx-auto w-full space-y-8 px-2 py-4">
      <div className="text-center space-y-3">
        <p className={cx(TYPE.eyebrow, "text-center mb-0 text-eq-glow/70 tracking-[0.32em]")}>Session</p>
        <h2 className={TYPE.heading}>Guided session</h2>
        <p className={cx(TYPE.subheadingMuted, "text-white/46 max-w-sm mx-auto text-center")}>
          A timed arc gently shapes motion and space while audio plays.
        </p>
      </div>

      <div className={cx(surfaceClass(SURFACE.raised, "rounded-[1.25rem]"), "p-5 space-y-4 backdrop-blur-xl")}>
        <p className={cx(TYPE.eyebrow, "mb-0")}>Duration</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {[5, 10, 15, 25].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onDurationPick(m)}
              className={cx(
                "px-4 py-2 rounded-full border text-sm font-light transition-all",
                sessionDurationPick === m
                  ? selectedSurfaceClass()
                  : cx(
                      "text-white/52 hover:text-white/88",
                      SURFACE.base.bg,
                      SURFACE.base.border,
                      SURFACE.base.interactive,
                    ),
              )}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      {clock ? (
        <div className={cx(surfaceClass(SURFACE.raised, "rounded-[1.25rem]"), "p-5 space-y-3 backdrop-blur-xl")} data-testid="session-active-progress">
          <p className={cx(TYPE.eyebrow, "mb-0")}>Progress</p>
          <p className="text-center font-mono text-sm tabular-nums text-eq-glow/85">
            {clock.elapsedLabel} / {sessionDurationPick}:00 · {clock.remainingLabel}
          </p>
          <div
            className={cx("h-1 w-full rounded-full overflow-hidden", SURFACE.meter.track)}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sessionProgress * 100)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-eq-glow/50 to-eq-glow/90 transition-[width] duration-700 ease-out"
              style={{ width: `${sessionProgress * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className={cx(surfaceClass(SURFACE.raised, "rounded-[1.25rem]"), "p-5 space-y-4 backdrop-blur-xl")}>
        <p className={cx(TYPE.eyebrow, "mb-0")}>Intent</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {(
            [
              ["regulate", "Regulate"],
              ["focus", "Focus"],
              ["sleep", "Wind down"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onIntentPick(id)}
              className={cx(
                "px-4 py-2 rounded-full border text-sm font-light capitalize transition-all",
                sessionIntentPick === id
                  ? selectedSurfaceClass()
                  : cx(
                      "text-white/52 hover:text-white/88",
                      SURFACE.base.bg,
                      SURFACE.base.border,
                      SURFACE.base.interactive,
                    ),
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <motion.button
          type="button"
          whileHover={{ scale: isStarting ? 1 : 1.02 }}
          whileTap={{ scale: isStarting ? 1 : 0.98 }}
          disabled={isStarting}
          onClick={onBeginSession}
          className={cx(
            "w-full py-4 rounded-[1.15rem] border font-light tracking-wide disabled:opacity-40 transition-all",
            sessionActive
              ? "border-eq-glow/25 bg-eq-glow/[0.08] text-eq-ink"
              : "border-eq-glow/35 bg-gradient-to-br from-eq-glow/[0.14] to-white/[0.05] text-eq-ink shadow-[0_0_32px_-14px_rgba(199,160,58,0.45)]",
          )}
        >
          {sessionActive ? "Session running — audio adapts over time" : "Begin session"}
        </motion.button>
        {sessionActive ? (
          <button
            type="button"
            onClick={onEndSession}
            className="text-xs text-center text-white/42 hover:text-eq-glow/90 underline underline-offset-4"
          >
            End session early
          </button>
        ) : null}
      </div>
    </div>
  );
}
