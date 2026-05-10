import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { REFLECT_CRISIS_SUPPORT_URL, ReflectView } from "../ReflectView";

describe("ReflectView", () => {
  it("fires all action callbacks and exposes the crisis support link", async () => {
    const user = userEvent.setup();
    const onLeaveFeedback = vi.fn();
    const onJournal = vi.fn();
    const onHistory = vi.fn();

    render(
      <ReflectView
        onLeaveFeedback={onLeaveFeedback}
        onJournal={onJournal}
        onHistory={onHistory}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Leave feedback" }));
    await user.click(screen.getByRole("button", { name: "Journal" }));
    await user.click(screen.getByRole("button", { name: "History" }));

    expect(onLeaveFeedback).toHaveBeenCalledTimes(1);
    expect(onJournal).toHaveBeenCalledTimes(1);
    expect(onHistory).toHaveBeenCalledTimes(1);

    const crisisLink = screen.getByRole("link", {
      name: /988 suicide & crisis lifeline/i,
    });
    expect(crisisLink.getAttribute("href")).toBe(REFLECT_CRISIS_SUPPORT_URL);
  });
});
