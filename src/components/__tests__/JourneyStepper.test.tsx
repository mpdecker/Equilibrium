import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JourneyStepper } from "../JourneyStepper";

describe("JourneyStepper", () => {
  it("navigates via onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<JourneyStepper activeTab="practice" onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Session" }));
    expect(onSelect).toHaveBeenCalledWith("session");
  });
});
