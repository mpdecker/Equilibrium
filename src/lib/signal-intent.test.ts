import { describe, it, expect } from "vitest";
import {
  inferMoodSignalIntentFromText,
  realizeAmbientParamsFromIntent,
  defaultMoodSignalIntent,
} from "./signal-intent.js";
import { validateMusicParams } from "./music-schema.js";

describe("mood signal intent", () => {
  it("infers high tension for stressed language", () => {
    const intent = inferMoodSignalIntentFromText("I am overwhelmed and stressed at work");
    expect(intent.tension).toBeGreaterThan(0.75);
    expect(intent.arousal).toBeGreaterThan(0.65);
  });

  it("realization lowers motion params under high tension vs baseline intent", () => {
    const llmParams = validateMusicParams({
      baseFrequency: 200,
      complexity: 0.9,
      lfoSpeed: 0.8,
      delayFeedback: 0.85,
    });
    const stressedIntent = { ...defaultMoodSignalIntent(), tension: 0.95, arousal: 0.9 };
    const out = realizeAmbientParamsFromIntent(stressedIntent, llmParams);
    expect(out.complexity).toBeLessThan(llmParams.complexity);
    expect(out.lfoSpeed).toBeLessThan(llmParams.lfoSpeed);
    expect(out.delayFeedback).toBeLessThan(llmParams.delayFeedback);
    expect(out.modulationIndex).toBeLessThanOrEqual(llmParams.modulationIndex);
  });
});
