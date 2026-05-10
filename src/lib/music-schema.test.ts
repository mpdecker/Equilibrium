import { describe, it, expect } from "vitest";
import {
  generateMusicRequestSchema,
  interactionPostSchema,
  journalPostSchema,
  ambientParamsFromClientPayload,
  normalizeEvolutionSettings,
  mergeGenerateMusicSessionId,
  parseOptionalSessionIdFromQuery,
  sessionUpsertSchema,
  parsePreferencesQuery,
} from "./music-schema.js";

describe("music-schema Zod contracts", () => {
  it("rejects empty mood in generate-music body", () => {
    const r = generateMusicRequestSchema.safeParse({ mood: "" });
    expect(r.success).toBe(false);
  });

  it("accepts minimal valid generate-music body", () => {
    const r = generateMusicRequestSchema.safeParse({
      mood: "calm",
      settings: { evolutionSpeed: 0.7 },
    });
    expect(r.success).toBe(true);
  });

  it("journalPostSchema trims content", () => {
    expect(journalPostSchema.safeParse({ content: "" }).success).toBe(false);
    const r = journalPostSchema.safeParse({
      content: " Hello ",
      moodText: "heavy",
      sessionId: "sessionsess12",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.content).toBe("Hello");
      expect(r.data.sessionId).toBe("sessionsess12");
    }
  });

  it("interactionPostSchema requires userResponse", () => {
    expect(interactionPostSchema.safeParse({ musicParams: {} }).success).toBe(false);
    expect(
      interactionPostSchema.safeParse({ musicParams: {}, userResponse: "ok" }).success,
    ).toBe(true);
  });

  it("ambientParamsFromClientPayload clamps unknown fields safely", () => {
    const p = ambientParamsFromClientPayload({
      baseFrequency: 9999,
      complexity: -1,
    } as Record<string, unknown>);
    expect(p.baseFrequency).toBeLessThanOrEqual(440);
    expect(p.complexity).toBeGreaterThanOrEqual(0);
  });

  it("normalizeEvolutionSettings preserves synthesis preferences", () => {
    expect(normalizeEvolutionSettings({ synthesisEngine: "preview" }).synthesisEngine).toBe("preview");
    expect(normalizeEvolutionSettings({ synthesisEngine: "auto" }).synthesisEngine).toBe("auto");
    expect(normalizeEvolutionSettings({ synthesisEngine: "tone" }).synthesisEngine).toBe("tone");
  });

  it("generate-music body accepts synthesisEngine in settings", () => {
    const r = generateMusicRequestSchema.safeParse({
      mood: "calm",
      settings: { synthesisEngine: "auto", evolutionSpeed: 0.2 },
    });
    expect(r.success).toBe(true);
  });

  it("mergeGenerateMusicSessionId prefers body over header", () => {
    expect(
      mergeGenerateMusicSessionId("aaaaaaaa", "bbbbbbbbbbbbbbbb"),
    ).toBe("aaaaaaaa");
    expect(
      mergeGenerateMusicSessionId(undefined, "  sessionsession1 "),
    ).toBe("sessionsession1");
    expect(mergeGenerateMusicSessionId(undefined, "short")).toBeUndefined();
  });

  it("parseOptionalSessionIdFromQuery validates session id", () => {
    expect(parseOptionalSessionIdFromQuery({ sessionId: "sessionsess12" })).toBe("sessionsess12");
    expect(parseOptionalSessionIdFromQuery({})).toBeUndefined();
    expect(parseOptionalSessionIdFromQuery({ sessionId: "x" })).toBeUndefined();
  });

  it("sessionUpsertSchema accepts optional envelope and userId", () => {
    const r = sessionUpsertSchema.safeParse({
      sessionId: "sessionsess12",
      userId: null,
      label: "Morning",
      soundscapeEnvelope: { envelopeVersion: 2 },
    });
    expect(r.success).toBe(true);
  });

  it("parsePreferencesQuery requires sessionId", () => {
    expect(parsePreferencesQuery({ sessionId: "sessionsess12" })?.sessionId).toBe("sessionsess12");
    expect(parsePreferencesQuery({})).toBeNull();
  });
});
