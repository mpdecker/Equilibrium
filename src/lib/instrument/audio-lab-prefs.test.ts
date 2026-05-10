import { describe, expect, it, beforeEach } from "vitest";
import { readAudioLabExpertOpen, writeAudioLabExpertOpen } from "./audio-lab-prefs";

describe("audio-lab prefs", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("equilibrium.audioLab.expert");
    } catch {
      /* ignore */
    }
  });

  it("defaults expert panel to closed", () => {
    expect(readAudioLabExpertOpen()).toBe(false);
  });

  it("round-trips expert open preference", () => {
    writeAudioLabExpertOpen(true);
    expect(readAudioLabExpertOpen()).toBe(true);
    writeAudioLabExpertOpen(false);
    expect(readAudioLabExpertOpen()).toBe(false);
  });
});
