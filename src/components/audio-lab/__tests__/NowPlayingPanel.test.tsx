import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NowPlayingPanel } from "../NowPlayingPanel";

describe("NowPlayingPanel", () => {
  it("renders runtime label and invokes play toggle", async () => {
    const onTogglePlay = vi.fn();
    render(
      <NowPlayingPanel
        runtimeLabel="Preview synthesis"
        isPlaying={false}
        isStarting={false}
        onTogglePlay={onTogglePlay}
        showPlaybackMacros={false}
        intensityPlayback={0.5}
        onIntensityChange={vi.fn()}
        brightnessPlayback={0.5}
        onBrightnessChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Preview synthesis")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /play from audio lab/i }));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });
});
