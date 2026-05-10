import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnginePanel } from "../EnginePanel";
import { defaultSettings } from "../../../lib/synth";

describe("EnginePanel", () => {
  it("calls onSettingsChange when a synthesis mode is chosen", async () => {
    const onSettingsChange = vi.fn();
    render(
      <EnginePanel
        playbackRuntimeLabel="Studio synthesis"
        settings={defaultSettings}
        onSettingsChange={onSettingsChange}
        rollout={{ engine: "tone", effectiveEngine: "tone", shadowMode: false }}
        lastShadowDiagnostics={null}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /^pcm$/i }));
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ synthesisEngine: "preview" }),
    );
  });

  it("shows shadow diagnostics when rollout shadow mode is on", () => {
    render(
      <EnginePanel
        playbackRuntimeLabel="Studio synthesis"
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
        rollout={{ engine: "tone", effectiveEngine: "tone", shadowMode: true }}
        lastShadowDiagnostics={null}
      />,
    );
    expect(screen.getByText(/shadow diagnostics/i)).toBeInTheDocument();
  });
});
