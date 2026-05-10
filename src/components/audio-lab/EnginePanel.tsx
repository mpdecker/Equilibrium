import React from "react";
import type { EvolutionSettings, SynthesisEnginePreference } from "../../lib/synth";
import type { ShadowComparisonResult } from "../../lib/audio-shadow";
import { SectionTitle } from "../ui/surface";
import { VS, TYPE, selectedSurfaceClass } from "../../constants/visual-system";
import { cx } from "../../lib/cx";

export type EnginePanelRollout = {
  engine: string;
  effectiveEngine: "tone" | "stub" | "wasm";
  shadowMode: boolean;
} | null;

export type EnginePanelProps = {
  /** Label for the effective playback path (mirrors Audio Lab “now playing”). */
  playbackRuntimeLabel: string;
  settings: EvolutionSettings;
  onSettingsChange: (next: EvolutionSettings) => void;
  rollout: EnginePanelRollout;
  lastShadowDiagnostics: ShadowComparisonResult | null;
};

export function EnginePanel({ playbackRuntimeLabel, settings, onSettingsChange, rollout, lastShadowDiagnostics }: EnginePanelProps) {
  const applySynthMode = (mode: SynthesisEnginePreference) => {
    onSettingsChange({ ...settings, synthesisEngine: mode });
  };

  return (
    <div>
      <SectionTitle>Playback engine</SectionTitle>
      <p className={cx(TYPE.subheadingMuted, "mb-3 text-xs")}>
        Resolved output: <span className="text-white/55">{playbackRuntimeLabel}</span>
        {settings.synthesisEngine === "auto" && rollout ? (
          <span className="text-white/40"> · server hints {rollout.effectiveEngine}</span>
        ) : null}
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.09] p-1 bg-eq-field/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {(
          [
            ["tone", "Studio"],
            ["preview", "PCM"],
            ["wasm", "Worklet"],
            ["auto", "Auto"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => applySynthMode(mode)}
            className={cx(
              "px-2 py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all border",
              settings.synthesisEngine === mode ? selectedSurfaceClass() : "text-white/42 hover:text-white/75 border-transparent",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className={cx(TYPE.subheadingMuted, "text-xs mt-3")}>
        {settings.synthesisEngine === "auto"
          ? rollout
            ? `Auto follows the server rollout (${rollout.effectiveEngine === "stub" ? "preview PCM" : rollout.effectiveEngine === "wasm" ? "AudioWorklet" : "Tone studio"}).`
            : "Loading rollout hint…"
          : settings.synthesisEngine === "preview"
            ? "PCM preview path — no Tone graph; ideal for shadow parity and light sessions."
            : settings.synthesisEngine === "wasm"
              ? "AudioWorklet processor — JS today; WASM core can replace the inner loop."
              : "Full Tone.js studio synthesis."}
      </p>
      {(lastShadowDiagnostics !== null || rollout?.shadowMode) && (
        <div className={cx(VS.panelInset, "mt-4 p-3 space-y-2")}>
          <div className={cx(TYPE.eyebrow, "text-eq-glow/75 tracking-[0.22em]")}>Shadow diagnostics</div>
          {rollout && (
            <p className={cx(TYPE.numeric, "text-[11px] text-white/55")}>
              Server shadow mode: <span className="font-mono">{rollout.shadowMode ? "on" : "off"}</span>
            </p>
          )}
          {lastShadowDiagnostics ? (
            <>
              <p
                className={cx(
                  TYPE.numeric,
                  "text-xs",
                  lastShadowDiagnostics.withinTolerance ? "text-emerald-400/90" : "text-amber-400/90",
                )}
              >
                PCM parity: {lastShadowDiagnostics.withinTolerance ? "within tolerance" : "outside tolerance"}
              </p>
              <div className={cx(TYPE.numeric, "grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-white/45")}>
                <span>Ref RMS {lastShadowDiagnostics.reference.rms.toFixed(4)}</span>
                <span>Tgt RMS {lastShadowDiagnostics.target.rms.toFixed(4)}</span>
                <span>Ref centroid {Math.round(lastShadowDiagnostics.reference.spectralCentroidApprox)} Hz</span>
                <span>Tgt centroid {Math.round(lastShadowDiagnostics.target.spectralCentroidApprox)} Hz</span>
              </div>
            </>
          ) : (
            rollout?.shadowMode && (
              <p className={cx(TYPE.subheadingMuted, "text-[11px] text-white/40 italic")}>
                Submit a mood update to fetch the latest fingerprint comparison.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
