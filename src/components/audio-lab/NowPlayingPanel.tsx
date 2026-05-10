import React from "react";
import { Play, Square } from "lucide-react";
import { SectionTitle } from "../ui/surface";
import { ParamSlider } from "../ParamSlider";
import { VS, TYPE } from "../../constants/visual-system";
import { cx } from "../../lib/cx";

export type NowPlayingPanelProps = {
  runtimeLabel: string;
  isPlaying: boolean;
  isStarting: boolean;
  onTogglePlay: () => void;
  showPlaybackMacros: boolean;
  intensityPlayback: number;
  onIntensityChange: (v: number) => void;
  brightnessPlayback: number;
  onBrightnessChange: (v: number) => void;
};

export function NowPlayingPanel({
  runtimeLabel,
  isPlaying,
  isStarting,
  onTogglePlay,
  showPlaybackMacros,
  intensityPlayback,
  onIntensityChange,
  brightnessPlayback,
  onBrightnessChange,
}: NowPlayingPanelProps) {
  return (
    <div>
      <SectionTitle>Now playing</SectionTitle>
      <div
        className={cx(
          VS.panel,
          "mb-4 flex items-center justify-between gap-4 p-3 border-eq-glow/12 shadow-[0_16px_44px_-32px_rgba(0,0,0,0.9)]",
        )}
      >
        <div className="min-w-0">
          <p className={cx(TYPE.subheadingMuted, "text-xs")}>{runtimeLabel}</p>
          <p className={cx(TYPE.subheading, "mt-1")}>
            {isStarting ? "Waking up engine..." : isPlaying ? "Synthesizing generative audio..." : "Engine paused"}
          </p>
        </div>
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={isStarting}
          aria-label={isPlaying ? "Pause from Audio Lab" : "Play from Audio Lab"}
          className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-full border border-eq-glow/35 bg-eq-glow/[0.1] text-eq-ink transition-colors hover:bg-eq-glow/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStarting ? (
            <span className="h-5 w-5 rounded-full border-2 border-t-eq-glow border-r-eq-glow border-b-transparent border-l-transparent animate-spin" />
          ) : isPlaying ? (
            <Square className="h-5 w-5 fill-current" aria-hidden />
          ) : (
            <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
          )}
        </button>
      </div>
      {showPlaybackMacros ? (
        <div className="space-y-4">
          <ParamSlider
            label="Playback intensity"
            value={intensityPlayback}
            min={0.35}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={onIntensityChange}
          />
          <ParamSlider
            label="Playback brightness"
            value={brightnessPlayback}
            min={0.35}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={onBrightnessChange}
          />
        </div>
      ) : (
        <p className="text-xs text-white/35 italic">Start playback to shape intensity and brightness.</p>
      )}
    </div>
  );
}
