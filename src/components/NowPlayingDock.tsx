import React from "react";
import { motion } from "motion/react";
import { Play, Square, SlidersHorizontal } from "lucide-react";
import { SURFACE, TYPE, surfaceClass } from "../constants/visual-system";
import { cx } from "../lib/cx";
import { formatSessionClockLabels } from "../lib/session-clock";

const RING_R = 46;
const RING_C = 2 * Math.PI * RING_R;

export function SessionRingOverlay({
  progress,
  className,
  testId,
}: {
  progress: number;
  className?: string;
  /** @internal */
  testId?: string;
}) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <svg
      aria-hidden
      data-testid={testId}
      className={cx("-rotate-90 pointer-events-none", className)}
      viewBox="0 0 100 100"
    >
      <circle
        cx="50"
        cy="50"
        r={RING_R}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="50"
        r={RING_R}
        fill="none"
        stroke="rgba(199,160,58,0.85)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${RING_C}`}
        strokeDashoffset={`${RING_C * (1 - p)}`}
      />
    </svg>
  );
}

export type NowPlayingDockProps = {
  isPlaying: boolean;
  isStarting: boolean;
  statusLine: string;
  onTogglePlay: () => void;
  onOpenAudioLab: () => void;
  /** Desktop: palette dots; optional on mobile */
  paletteColors: string[];
  onOpenPalettes: () => void;
  /** Timed session progress 0..1; shows ring + subline when set with duration. */
  sessionProgress?: number | null;
  sessionDurationMinutes?: number;
};

export function DesktopNowPlayingFooter({
  isPlaying,
  isStarting,
  statusLine,
  onTogglePlay,
  onOpenAudioLab,
  paletteColors,
  onOpenPalettes,
  sessionProgress = null,
  sessionDurationMinutes,
}: NowPlayingDockProps) {
  const showSession =
    typeof sessionProgress === "number" &&
    sessionProgress >= 0 &&
    sessionProgress <= 1 &&
    typeof sessionDurationMinutes === "number" &&
    sessionDurationMinutes > 0;
  const clock =
    showSession &&
    formatSessionClockLabels(sessionProgress, sessionDurationMinutes);

  return (
    <footer className="mt-auto hidden md:block">
      <div
        className={cx(
          surfaceClass(SURFACE.float, "rounded-[1.25rem]"),
          "p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
        )}
      >
        <div className="flex flex-col space-y-2 w-full md:w-auto text-center md:text-left min-w-0">
          <div className="flex flex-col space-y-1.5">
            <p className={cx(TYPE.eyebrow, "font-mono tracking-[0.26em] text-white/38")}>Signal</p>
            <p className={TYPE.subheading}>{statusLine}</p>
          </div>
          {clock ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-eq-glow/80 tabular-nums">
                Session · {clock.remainingLabel} · {clock.elapsedLabel} elapsed
              </p>
              <div
                className={cx("h-1 w-full max-w-xs mx-auto md:mx-0 rounded-full overflow-hidden mt-1", SURFACE.meter.track)}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(sessionProgress * 100)}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-eq-glow/55 to-eq-glow/85 transition-[width] duration-700 ease-out"
                  style={{ width: `${sessionProgress * 100}%` }}
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <motion.button
            type="button"
            whileHover={{ scale: isStarting ? 1 : 1.05 }}
            whileTap={{ scale: isStarting ? 1 : 0.95 }}
            onClick={onOpenAudioLab}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-eq-glow/25 bg-eq-glow/[0.08] text-[10px] font-medium uppercase tracking-[0.2em] text-eq-glow/95 hover:bg-eq-glow/[0.12] transition-colors"
            aria-label="Open audio lab"
          >
            <SlidersHorizontal className="w-4 h-4 opacity-90" aria-hidden />
            Lab
          </motion.button>

          <div className="relative shrink-0">
            {showSession ? (
              <SessionRingOverlay
                progress={sessionProgress}
                testId="desktop-session-ring"
                className="absolute inset-0 -m-1 w-[calc(100%+0.5rem)] h-[calc(100%+0.5rem)]"
              />
            ) : null}
            <motion.button
              type="button"
              whileHover={{ scale: isStarting ? 1 : 1.06 }}
              whileTap={{ scale: isStarting ? 1 : 0.94 }}
              onClick={onTogglePlay}
              disabled={isStarting}
              aria-label={isPlaying ? "Pause" : "Play"}
              className={cx(
                "relative z-[1] w-[5.25rem] h-[5.25rem] rounded-full border flex items-center justify-center transition-all shadow-[0_0_44px_-14px_rgba(199,160,58,0.55)]",
                isStarting
                  ? "border-white/10 opacity-50 cursor-not-allowed bg-black/30"
                  : "border-eq-glow/35 bg-gradient-to-br from-white/[0.12] to-black/40 hover:border-eq-glow/55 cursor-pointer",
              )}
            >
              {isStarting ? (
                <div className="w-6 h-6 border-2 border-t-eq-glow border-r-eq-glow border-b-transparent border-l-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Square className="w-6 h-6 text-eq-ink/90 fill-current" aria-hidden />
              ) : (
                <Play className="w-8 h-8 text-eq-glow/95 fill-current ml-1" aria-hidden />
              )}
            </motion.button>
          </div>
        </div>

        <div className="flex flex-col space-y-2 w-full md:w-auto text-center md:text-right">
          <p className={cx(TYPE.eyebrow, "font-mono tracking-[0.26em] text-white/38")}>Palette</p>
          <div
            role="button"
            tabIndex={0}
            className="flex gap-2 justify-center md:justify-end cursor-pointer group outline-none rounded-xl px-1 py-1 -mx-1 focus-visible:ring-2 focus-visible:ring-eq-glow/50"
            onClick={onOpenPalettes}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenPalettes();
              }
            }}
            title="Change Color Palette"
          >
            {paletteColors.map((color, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-white/25 shadow-md ring-1 ring-black/30 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MobileNowPlayingBar({
  isPlaying,
  isStarting,
  statusLine,
  onTogglePlay,
  onOpenAudioLab,
  sessionProgress = null,
  sessionDurationMinutes,
}: Pick<
  NowPlayingDockProps,
  "isPlaying" | "isStarting" | "statusLine" | "onTogglePlay" | "onOpenAudioLab"
> & {
  sessionProgress?: number | null;
  sessionDurationMinutes?: number;
}) {
  const showSession =
    typeof sessionProgress === "number" &&
    sessionProgress >= 0 &&
    sessionProgress <= 1 &&
    typeof sessionDurationMinutes === "number" &&
    sessionDurationMinutes > 0;
  const clock =
    showSession &&
    formatSessionClockLabels(sessionProgress, sessionDurationMinutes);

  return (
    <div
      className="md:hidden fixed left-0 right-0 z-[105] px-3"
      style={{ bottom: "calc(4.25rem + max(0px, env(safe-area-inset-bottom)))" }}
    >
      <div
        className={cx(
          surfaceClass(SURFACE.float, "rounded-[1.25rem]"),
          "mx-auto max-w-lg px-3 py-2.5 flex flex-col gap-2 border-eq-glow/12",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className={cx(TYPE.eyebrow, "font-mono text-[9px] tracking-[0.22em] text-white/38")}>Now</p>
            <p className={cx(TYPE.subheading, "text-[11px] truncate")}>{statusLine}</p>
            {clock ? (
              <p className="font-mono text-[10px] text-eq-glow/75 tabular-nums mt-1 truncate">
                {clock.remainingLabel}
              </p>
            ) : null}
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onOpenAudioLab}
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-eq-glow/28 bg-eq-glow/[0.1] text-eq-glow"
            aria-label="Open audio lab"
          >
            <SlidersHorizontal className="w-5 h-5" aria-hidden />
          </motion.button>

          <div className="relative shrink-0">
            {showSession ? (
              <SessionRingOverlay
                progress={sessionProgress}
                testId="mobile-form-session-ring"
                className="absolute inset-0 -m-0.5 w-[3.25rem] h-[3.25rem]"
              />
            ) : null}
            <motion.button
              type="button"
              whileTap={{ scale: isStarting ? 1 : 0.97 }}
              onClick={onTogglePlay}
              disabled={isStarting}
              aria-label={isPlaying ? "Pause" : "Play"}
              className={cx(
                "relative z-[1] shrink-0 w-12 h-12 rounded-full border flex items-center justify-center transition-all",
                isStarting
                  ? "border-white/10 opacity-50"
                  : "border-eq-glow/35 bg-gradient-to-br from-white/10 to-black/40 shadow-[0_0_24px_-10px_rgba(199,160,58,0.5)]",
              )}
            >
              {isStarting ? (
                <div className="w-5 h-5 border-2 border-t-eq-glow border-r-eq-glow border-b-transparent border-l-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Square className="w-5 h-5 text-eq-ink/90 fill-current" aria-hidden />
              ) : (
                <Play className="w-6 h-6 text-eq-glow/95 fill-current ml-0.5" aria-hidden />
              )}
            </motion.button>
          </div>
        </div>
        {clock ? (
          <div
            className={cx("h-0.5 w-full rounded-full overflow-hidden", SURFACE.meter.track)}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sessionProgress * 100)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-eq-glow/55 to-eq-glow/85 transition-[width] duration-700 ease-out"
              style={{ width: `${sessionProgress * 100}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
