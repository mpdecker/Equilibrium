import { describe, it, expect } from "vitest";
import { buildPreferenceSummaryFromInteractions } from "./preference-summary.js";

describe("buildPreferenceSummaryFromInteractions", () => {
  it("returns empty string without usable rows", () => {
    expect(buildPreferenceSummaryFromInteractions([], 400)).toBe("");
    expect(buildPreferenceSummaryFromInteractions([{ userResponse: "maybe", musicParams: {} }])).toBe("");
  });

  it("summarizes positive averages and negative phrases", () => {
    const params = {
      complexity: 0.4,
      noiseAmount: 0.2,
      reverbWet: 0.75,
      baseFrequency: 90,
      harmonicity: 2,
    };
    const summary = buildPreferenceSummaryFromInteractions(
      [
        { userResponse: "great! calm evening", musicParams: params },
        { userResponse: "Too harsh", musicParams: { complexity: 1 } },
      ],
      2000,
    );
    expect(summary).toContain("complexity");
    expect(summary).toContain("modulationIndex");
    expect(summary).toContain("Interaction tone");
    expect(summary).toContain("friction");
  });

  it("ignores instrument gesture telemetry rows", () => {
    const params = { complexity: 0.5, noiseAmount: 0.1, reverbWet: 0.5, baseFrequency: 100, harmonicity: 1 };
    const summary = buildPreferenceSummaryFromInteractions(
      [
        { userResponse: "instrument.gesture.intensity", musicParams: params },
        { userResponse: "great", musicParams: params },
      ],
      2000,
    );
    expect(summary).toContain("complexity");
  });
});
