import React from "react";
import type { EvolutionSettings } from "../../lib/synth";
import { SectionTitle } from "../ui/surface";
import { ParamSlider } from "../ParamSlider";

export type AgenticEvolutionProps = {
  settings: EvolutionSettings;
  onSettingsChange: (next: EvolutionSettings) => void;
};

export function AgenticEvolution({ settings, onSettingsChange }: AgenticEvolutionProps) {
  return (
    <div>
      <SectionTitle sticky>Agentic Evolution</SectionTitle>
      <div className="space-y-4">
        <ParamSlider
          label="Timbre Diversity"
          value={settings.timbreDiversity}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onSettingsChange({ ...settings, timbreDiversity: v })}
        />
        <ParamSlider
          label="Evolution Speed"
          value={settings.evolutionSpeed}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onSettingsChange({ ...settings, evolutionSpeed: v })}
        />
        <ParamSlider
          label="Feedback Subtlety"
          value={settings.feedbackSubtlety}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onSettingsChange({ ...settings, feedbackSubtlety: v })}
        />
        <ParamSlider
          label="Particle Density"
          value={settings.particleDensity}
          min={50}
          max={300}
          step={10}
          onChange={(v) => onSettingsChange({ ...settings, particleDensity: v })}
        />
      </div>
    </div>
  );
}
