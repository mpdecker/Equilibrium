import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdvancedSoundDesign } from "../AdvancedSoundDesign";
import { defaultParams } from "../../../lib/synth";

describe("AdvancedSoundDesign", () => {
  it("propagates Master Volume changes", () => {
    const onParamsChange = vi.fn();
    render(<AdvancedSoundDesign params={defaultParams} onParamsChange={onParamsChange} />);

    const slider = screen.getByRole("slider", { name: /master volume/i });
    fireEvent.change(slider, { target: { value: "-20" } });
    expect(onParamsChange).toHaveBeenCalledWith(expect.objectContaining({ volume: -20 }));
  });
});
