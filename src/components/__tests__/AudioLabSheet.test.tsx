import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AudioLabSheet } from "../AudioLabSheet";
import { defaultParams, defaultSettings } from "../../lib/synth";

const baseProps = {
  open: true,
  onClose: vi.fn(),
  resolvedRuntime: "tone" as const,
  rollout: null,
  lastShadowDiagnostics: null,
  isPlaying: false,
  isStarting: false,
  onTogglePlay: vi.fn(),
  showPlaybackMacros: true,
  intensityPlayback: 0.88,
  onIntensityChange: vi.fn(),
  brightnessPlayback: 0.9,
  onBrightnessChange: vi.fn(),
  onOpenPalettes: vi.fn(),
  colorPalettePreview: defaultParams.colorPalette,
  params: defaultParams,
  onParamsChange: vi.fn(),
  settings: defaultSettings,
  onSettingsChange: vi.fn(),
};

describe("AudioLabSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try {
      localStorage.removeItem("equilibrium.audioLab.expert");
    } catch {
      /* ignore */
    }
  });

  it("exposes transport control in the now playing section", async () => {
    const onTogglePlay = vi.fn();

    render(<AudioLabSheet {...baseProps} onTogglePlay={onTogglePlay} showPlaybackMacros={false} />);

    await userEvent.click(screen.getByRole("button", { name: /play from audio lab/i }));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it("shows playback macros without opening expert disclosure", () => {
    render(<AudioLabSheet {...baseProps} />);
    expect(screen.getByRole("slider", { name: /playback intensity/i })).toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: /master volume/i })).toBeNull();
  });

  it("toggle expert disclosure shows advanced sliders", async () => {
    render(<AudioLabSheet {...baseProps} />);
    expect(screen.queryByRole("slider", { name: /master volume/i })).toBeNull();

    const toggle = screen.getByRole("button", { name: /show expert controls/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: /hide expert controls/i }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("slider", { name: /master volume/i })).toBeInTheDocument();
  });

  it("restores expert open state from localStorage", () => {
    try {
      localStorage.setItem("equilibrium.audioLab.expert", "1");
    } catch {
      /* ignore */
    }
    render(<AudioLabSheet {...baseProps} />);
    expect(screen.getByRole("slider", { name: /master volume/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hide expert controls/i })).toBeInTheDocument();
  });

  it("invokes replay walkthrough callback", async () => {
    const onReplayWalkthrough = vi.fn();
    render(<AudioLabSheet {...baseProps} onReplayWalkthrough={onReplayWalkthrough} />);

    await userEvent.click(screen.getByRole("button", { name: /replay stage walkthrough/i }));
    expect(onReplayWalkthrough).toHaveBeenCalledTimes(1);
  });
});
