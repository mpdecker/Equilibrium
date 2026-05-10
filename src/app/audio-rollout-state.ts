import type { ServerInstrumentRolloutValue } from "../lib/instrument/feature-flag";

export type AudioRolloutState = {
  engine: string;
  effectiveEngine: "tone" | "stub" | "wasm";
  shadowMode: boolean;
  schemaVersion: number;
  instrument: ServerInstrumentRolloutValue;
};
