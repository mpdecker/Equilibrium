import { describe, it, expect } from "vitest";
import { pickNewerSoundscape, soundscapeTimestampMs } from "./session-storage.js";
import type { SoundscapeEnvelope } from "./music-params-envelope.js";
import { defaultParams } from "./music-schema.js";

function env(at: string, updated?: string): SoundscapeEnvelope {
  return {
    envelopeVersion: 2,
    schemaVersion: 1,
    sessionId: "s1",
    createdAt: at,
    ...(updated ? { updatedAt: updated } : {}),
    params: { ...defaultParams },
  };
}

describe("session-storage merge helpers", () => {
  it("soundscapeTimestampMs prefers updatedAt over createdAt", () => {
    const e = env("2020-01-01T00:00:00.000Z", "2025-06-01T12:00:00.000Z");
    expect(soundscapeTimestampMs(e)).toBe(Date.parse("2025-06-01T12:00:00.000Z"));
  });

  it("pickNewerSoundscape chooses newer envelope", () => {
    const older = env("2020-01-01T00:00:00.000Z");
    const newer = env("2025-01-01T00:00:00.000Z");
    expect(pickNewerSoundscape(older, newer)).toBe(newer);
    expect(pickNewerSoundscape(newer, older)).toBe(newer);
  });

  it("pickNewerSoundscape breaks ties toward second argument", () => {
    const a = env("2024-01-01T00:00:00.000Z");
    const b = {
      ...env("2024-01-01T00:00:00.000Z"),
      sessionId: "b-wins-tie",
    };
    expect(pickNewerSoundscape(a, b)?.sessionId).toBe("b-wins-tie");
  });

});
