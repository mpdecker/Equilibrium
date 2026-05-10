import { describe, it, expect } from "vitest";
import { GEMINI_MUSIC_RESPONSE_SCHEMA } from "../lib/gemini-response-schema.js";
import { defaultParams } from "../lib/music-schema.js";

describe("Gemini response schema contract", () => {
  it("declares every AmbientParams field plus moodSignalIntent and feedbackPrompt", () => {
    const props = GEMINI_MUSIC_RESPONSE_SCHEMA.properties as Record<string, unknown>;
    const paramKeys = Object.keys(defaultParams) as (keyof typeof defaultParams)[];
    for (const k of paramKeys) {
      expect(props[String(k)]).toBeDefined();
    }
    expect(props.moodSignalIntent).toBeDefined();
    expect(props.feedbackPrompt).toBeDefined();
  });
});
