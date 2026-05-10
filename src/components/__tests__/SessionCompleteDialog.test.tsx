import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionCompleteDialog } from "../SessionCompleteDialog";

describe("SessionCompleteDialog", () => {
  it("renders an accessible completion dialog", () => {
    render(<SessionCompleteDialog open autoDismissMs={0} onClose={vi.fn()} onSelectFeedback={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Session complete" })).toBeTruthy();
    expect(screen.getByText("How was this held space for you?")).toBeTruthy();
  });

  it("submits feedback and supports dismiss", async () => {
    const user = userEvent.setup();
    const onSelectFeedback = vi.fn();
    const onClose = vi.fn();

    render(<SessionCompleteDialog open autoDismissMs={0} onClose={onClose} onSelectFeedback={onSelectFeedback} />);

    await user.click(screen.getByRole("button", { name: "Grounding" }));
    expect(onSelectFeedback).toHaveBeenCalledWith("Grounding");

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<SessionCompleteDialog open autoDismissMs={0} onClose={onClose} onSelectFeedback={vi.fn()} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Reflect and Journal callbacks run", async () => {
    const user = userEvent.setup();
    const onReflect = vi.fn();
    const onJournal = vi.fn();

    render(
      <SessionCompleteDialog
        open
        autoDismissMs={0}
        onClose={vi.fn()}
        onSelectFeedback={vi.fn()}
        onReflect={onReflect}
        onJournal={onJournal}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reflect on this session" }));
    expect(onReflect).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Journal" }));
    expect(onJournal).toHaveBeenCalledTimes(1);
  });
});
