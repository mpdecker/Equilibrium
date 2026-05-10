import { describe, it, expect } from "vitest";
import {
  isMusicParamsEnvelope,
  isSoundscapeEnvelope,
  toMusicParamsEnvelope,
  toSoundscapeEnvelope,
  unwrapMusicParams,
  unwrapMoodIntent,
} from "./music-params-envelope.js";
import { defaultParams } from "./music-schema.js";
import type { MoodSignalIntent } from "./signal-intent.js";

describe("music-params-envelope", () => {
  it("detects v1 envelopes", () => {
    const intent: MoodSignalIntent = {
      arousal: 0.5,
      valence: 0.5,
      tension: 0.5,
      cognitiveLoad: 0.5,
      grounding: 0.5,
    };
    const env = toMusicParamsEnvelope(defaultParams, intent);
    expect(isMusicParamsEnvelope(env)).toBe(true);
    expect(unwrapMusicParams(env)).toEqual(defaultParams);
    expect(unwrapMoodIntent(env)).toEqual(intent);
  });

  it("unwraps legacy flat payloads", () => {
    const flat = { baseFrequency: 90 };
    expect(isMusicParamsEnvelope(flat)).toBe(false);
    const params = unwrapMusicParams(flat);
    expect(params.baseFrequency).toBe(90);
  });

  it("unwrapMoodIntent returns undefined without envelope intent", () => {
    expect(unwrapMoodIntent({ schemaVersion: 1, params: defaultParams })).toBeUndefined();
  });

  it("detects v2 soundscape envelopes", () => {
    const env = toSoundscapeEnvelope({
      params: defaultParams,
      moodSignalIntent: {
        arousal: 0.5,
        valence: 0.5,
        tension: 0.5,
        cognitiveLoad: 0.5,
        grounding: 0.5,
      },
      sessionId: "test-session-id",
    });
    expect(isSoundscapeEnvelope(env)).toBe(true);
    expect(isMusicParamsEnvelope(env)).toBe(true);
    expect(unwrapMusicParams(env).baseFrequency).toBe(defaultParams.baseFrequency);
    expect(unwrapMoodIntent(env)?.arousal).toBe(0.5);
  });
});
