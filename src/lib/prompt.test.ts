import { describe, it, expect } from "vitest";
import { buildGenerateMusicPrompt } from "./prompt.js";
import { defaultParams, normalizeEvolutionSettings } from "./music-schema.js";

describe("buildGenerateMusicPrompt", () => {
  it("includes mood, settings, currentParams snapshot, and subtlety guidance", () => {
    const prompt = buildGenerateMusicPrompt({
      mood: 'Anxious about "deadlines"',
      recentJournals: [{ content: "Could not sleep" }],
      recentInteractions: [{ userResponse: "too loud", musicParams: { baseFrequency: 90 } }],
      settings: normalizeEvolutionSettings({ feedbackSubtlety: 0.2 }),
      currentParams: defaultParams,
    });
    expect(prompt).toContain("Anxious about");
    expect(prompt).toContain("Could not sleep");
    expect(prompt).toContain("too loud");
    expect(prompt).toContain("Feedback Subtlety");
    expect(prompt).toContain("currentParams");
    expect(prompt).toContain("moodSignalIntent");
    expect(prompt).toContain("Learned preference compression");
  });

  it("includes preference summary block when provided", () => {
    const prompt = buildGenerateMusicPrompt({
      mood: "steady",
      recentJournals: [],
      recentInteractions: [],
      preferenceSummary: "User prefers softer tails.",
      settings: normalizeEvolutionSettings({}),
      currentParams: defaultParams,
    });
    expect(prompt).toContain("User prefers softer tails.");
  });
});
