import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JournalComposer } from "../JournalComposer";

describe("JournalComposer", () => {
  it("renders an accessible journal dialog with disabled save when empty", () => {
    render(
      <JournalComposer
        open
        value=""
        isSaving={false}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Journal Space" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Empty your mind here...")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Entry" })).toBeDisabled();
  });

  it("submits and closes through explicit controls", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <JournalComposer
        open
        value="A calmer note"
        isSaving={false}
        onChange={vi.fn()}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save Entry" }));
    expect(onSave).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <JournalComposer
        open
        value="Draft"
        isSaving={false}
        onChange={vi.fn()}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
