import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomSheet } from "../BottomSheet";

describe("BottomSheet", () => {
  it("renders dialog with title and Done closes", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open title="Test Sheet" onClose={onClose}>
        <p>Inside content</p>
      </BottomSheet>,
    );

    expect(screen.getByRole("dialog", { name: "Test Sheet" })).toBeTruthy();
    expect(screen.getByText("Inside content")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
