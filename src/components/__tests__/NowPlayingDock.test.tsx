import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DesktopNowPlayingFooter } from "../NowPlayingDock";

describe("DesktopNowPlayingFooter session progress", () => {
  it("renders session ring when progress is provided", () => {
    render(
      <DesktopNowPlayingFooter
        isPlaying
        isStarting={false}
        statusLine="Playing"
        onTogglePlay={vi.fn()}
        onOpenAudioLab={vi.fn()}
        paletteColors={["#000", "#111", "#222"]}
        onOpenPalettes={vi.fn()}
        sessionProgress={0.4}
        sessionDurationMinutes={10}
      />,
    );
    expect(screen.getByTestId("desktop-session-ring")).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });
});
