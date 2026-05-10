import React from "react";
import type { AmbientParams } from "../../lib/synth";
import { SectionTitle } from "../ui/surface";
import { ParamSlider } from "../ParamSlider";
import { AudioLabSectionDivider } from "./SectionDivider";

export type AdvancedSoundDesignProps = {
  params: AmbientParams;
  onParamsChange: (next: AmbientParams) => void;
};

export function AdvancedSoundDesign({ params, onParamsChange }: AdvancedSoundDesignProps) {
  return (
    <div>
      <SectionTitle sticky className="z-10">
        Advanced sound design
      </SectionTitle>
      <div className="space-y-4">
        <ParamSlider
          label="Master Volume"
          value={params.volume}
          min={-60}
          max={0}
          step={1}
          format={(v) => `${v} dB`}
          onChange={(v) => onParamsChange({ ...params, volume: v })}
        />

        <AudioLabSectionDivider />

        <ParamSlider
          label="Drone Layer Vol"
          value={params.droneVolume}
          min={-60}
          max={0}
          step={1}
          format={(v) => `${v} dB`}
          onChange={(v) => onParamsChange({ ...params, droneVolume: v })}
        />
        <ParamSlider
          label="Pad Layer Vol"
          value={params.padVolume}
          min={-60}
          max={0}
          step={1}
          format={(v) => `${v} dB`}
          onChange={(v) => onParamsChange({ ...params, padVolume: v })}
        />
        <ParamSlider
          label="Arp Layer Vol"
          value={params.arpVolume}
          min={-60}
          max={0}
          step={1}
          format={(v) => `${v} dB`}
          onChange={(v) => onParamsChange({ ...params, arpVolume: v })}
        />
        <ParamSlider
          label="Bell Layer Vol"
          value={params.bellVolume}
          min={-60}
          max={0}
          step={1}
          format={(v) => `${v} dB`}
          onChange={(v) => onParamsChange({ ...params, bellVolume: v })}
        />
        <ParamSlider
          label="Sub Layer Vol"
          value={params.subVolume}
          min={-60}
          max={0}
          step={1}
          format={(v) => `${v} dB`}
          onChange={(v) => onParamsChange({ ...params, subVolume: v })}
        />

        <AudioLabSectionDivider />

        <ParamSlider
          label="Base Frequency"
          value={params.baseFrequency}
          min={40}
          max={440}
          step={1}
          format={(v) => `${v} Hz`}
          onChange={(v) => onParamsChange({ ...params, baseFrequency: v })}
        />
        <ParamSlider
          label="Complexity"
          value={params.complexity}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}`}
          onChange={(v) => onParamsChange({ ...params, complexity: v })}
        />
        <ParamSlider
          label="Harmonicity"
          value={params.harmonicity}
          min={0.1}
          max={5.0}
          step={0.1}
          onChange={(v) => onParamsChange({ ...params, harmonicity: v })}
        />
        <ParamSlider
          label="Modulation Index"
          value={params.modulationIndex}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => onParamsChange({ ...params, modulationIndex: v })}
        />

        <AudioLabSectionDivider />

        <ParamSlider
          label="Attack Time"
          value={params.attackTime}
          min={0.1}
          max={10}
          step={0.1}
          format={(v) => `${v.toFixed(1)}s`}
          onChange={(v) => onParamsChange({ ...params, attackTime: v })}
        />
        <ParamSlider
          label="Release Time"
          value={params.releaseTime}
          min={0.1}
          max={20}
          step={0.1}
          format={(v) => `${v.toFixed(1)}s`}
          onChange={(v) => onParamsChange({ ...params, releaseTime: v })}
        />

        <AudioLabSectionDivider />

        <ParamSlider
          label="Reverb Wet"
          value={params.reverbWet}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onParamsChange({ ...params, reverbWet: v })}
        />
        <ParamSlider
          label="Reverb Decay"
          value={params.reverbDecay}
          min={1}
          max={20}
          step={0.5}
          format={(v) => `${v.toFixed(1)}s`}
          onChange={(v) => onParamsChange({ ...params, reverbDecay: v })}
        />
        <ParamSlider
          label="Delay Feedback"
          value={params.delayFeedback}
          min={0}
          max={0.9}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onParamsChange({ ...params, delayFeedback: v })}
        />

        <AudioLabSectionDivider />

        <ParamSlider
          label="Chorus Depth"
          value={params.chorusDepth}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onParamsChange({ ...params, chorusDepth: v })}
        />
        <ParamSlider
          label="Phaser Frequency"
          value={params.phaserFrequency}
          min={0.1}
          max={10}
          step={0.1}
          format={(v) => `${v.toFixed(1)}Hz`}
          onChange={(v) => onParamsChange({ ...params, phaserFrequency: v })}
        />
        <ParamSlider
          label="LFO Speed"
          value={params.lfoSpeed}
          min={0.01}
          max={1.0}
          step={0.01}
          format={(v) => `${v.toFixed(2)}Hz`}
          onChange={(v) => onParamsChange({ ...params, lfoSpeed: v })}
        />
        <ParamSlider
          label="Tape Hiss (Noise)"
          value={params.noiseAmount}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onParamsChange({ ...params, noiseAmount: v })}
        />
      </div>
    </div>
  );
}
