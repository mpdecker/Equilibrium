import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmbientStage } from "../AmbientStage";
import { defaultParams, defaultSettings } from "../../lib/synth";

describe("AmbientStage", () => {
  it("renders the visualizer canvas and reflects palette colors from params without App state", () => {
    const params = {
      ...defaultParams,
      colorPalette: ["#ff00aa", "#00ff99", "#3355ff"],
    };
    const { container } = render(
      <div className="relative h-[300px] w-[400px]">
        <AmbientStage
          params={params}
          settings={defaultSettings}
          isPlaying
          prefersReducedMotion
          analyser={null}
        />
      </div>,
    );

    expect(container.querySelector("canvas")).toBeTruthy();
    const html = container.innerHTML;
    // Inline styles may normalize hex to rgb()
    expect(html).toMatch(/ff00aa|255,\s*0,\s*170/i);
    expect(html).toMatch(/00ff99|0,\s*255,\s*153/i);
    expect(html).toMatch(/3355ff|51,\s*85,\s*255/i);
  });
});
