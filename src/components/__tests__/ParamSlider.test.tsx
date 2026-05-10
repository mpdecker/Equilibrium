import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParamSlider } from "../ParamSlider";

describe("ParamSlider", () => {
  it("calls onChange when the range value changes", () => {
    const onChange = vi.fn();
    render(
      <ParamSlider label="Test param" value={0.5} min={0} max={1} step={0.1} onChange={onChange} />,
    );
    const input = screen.getByRole("slider", { name: /test param/i });
    fireEvent.change(input, { target: { value: "0.8" } });
    expect(onChange).toHaveBeenCalledWith(0.8);
  });
});
