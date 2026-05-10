import type { AmbientParams } from "../lib/synth";

export type ColorPaletteDef = {
  name: string;
  colors: string[];
  params: Partial<AmbientParams>;
};

export const COLOR_PALETTES: ColorPaletteDef[] = [
  {
    name: "Midnight",
    colors: ["#1e1b4b", "#4c1d95", "#0ea5e9"],
    params: {
      oscillatorType: "sine",
      baseFrequency: 73.42, // D2
      chordIntervals: [0, 7, 14, 21, 24], // Very resonant wide voicings
      noiseType: "brown",
      noiseAmount: 0.2, // Subtle tape hiss
      lfoSpeed: 0.05, // Slow Eno drift
      delayTime: "2n", // Long delay
      complexity: 0.2, // Minimal wobble
      reverbWet: 0.9, // Huge hall
      harmonicity: 2.1,
      modulationIndex: 1.5,
    },
  },
  {
    name: "Forest",
    colors: ["#022c22", "#065f46", "#34d399"],
    params: {
      oscillatorType: "triangle",
      baseFrequency: 110.0, // A2
      chordIntervals: [0, 3, 7, 14, 17], // Minor 9th
      noiseType: "pink",
      noiseAmount: 0.6, // Heavier tape saturation
      lfoSpeed: 1.2, // Fast boards of canada flutter
      delayTime: "4n",
      complexity: 0.8, // Heavy wobble
      reverbWet: 0.5, // Drier, more analog room
      harmonicity: 1.5,
      modulationIndex: 3.5,
    },
  },
  {
    name: "Sunset",
    colors: ["#4a044e", "#9f1239", "#fb923c"],
    params: {
      oscillatorType: "sawtooth",
      baseFrequency: 138.59, // C#3
      chordIntervals: [0, 4, 7, 11, 14], // Lush Major 9
      noiseType: "brown",
      noiseAmount: 0.4,
      lfoSpeed: 0.2,
      delayTime: "8n", // Bouncy delay
      complexity: 0.5,
      reverbWet: 0.7,
      harmonicity: 3.0,
      modulationIndex: 2.5,
    },
  },
  {
    name: "Ocean",
    colors: ["#082f49", "#0284c7", "#38bdf8"],
    params: {
      oscillatorType: "sine",
      baseFrequency: 65.41, // C2 - Deep
      chordIntervals: [0, 7, 12, 19, 24], // Open fifths
      noiseType: "white",
      noiseAmount: 0.1,
      lfoSpeed: 0.01, // Glacial pace
      delayTime: "2n",
      complexity: 0.1, // Pure tones
      reverbWet: 1.0, // Drowned in reverb
      harmonicity: 1.1,
      modulationIndex: 0.5,
    },
  },
  {
    name: "Ember",
    colors: ["#450a0a", "#991b1b", "#f87171"],
    params: {
      oscillatorType: "square",
      baseFrequency: 98.0, // G2
      chordIntervals: [0, 3, 6, 9], // Dark diminished
      noiseType: "brown",
      noiseAmount: 0.8, // Fried tape
      lfoSpeed: 2.0, // broken vibrato
      delayTime: "8n",
      complexity: 1.0, // Totally unstable
      reverbWet: 0.4,
      harmonicity: 4.5,
      modulationIndex: 6.0,
    },
  },
  {
    name: "Monochrome",
    colors: ["#171717", "#525252", "#a3a3a3"],
    params: {
      oscillatorType: "sine",
      baseFrequency: 220, // A3
      chordIntervals: [0, 12, 24], // Minimalist
      noiseType: "white",
      noiseAmount: 0.0, // Sterile
      lfoSpeed: 0.1,
      delayTime: "4n",
      complexity: 0.0, // No pitch variation
      reverbWet: 0.6,
      harmonicity: 1.0,
      modulationIndex: 0.0,
    },
  },
];
