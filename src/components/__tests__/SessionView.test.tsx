import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionView } from "../SessionView";

describe("SessionView", () => {
  const baseProps = {
    sessionIntentPick: "regulate" as const,
    sessionDurationPick: 10,
    sessionActive: false,
    isStarting: false,
    onDurationPick: vi.fn(),
    onIntentPick: vi.fn(),
    onBeginSession: vi.fn(),
    onEndSession: vi.fn(),
  };

  it("selects duration and intent via callbacks", async () => {
    const user = userEvent.setup();
    const onDurationPick = vi.fn();
    const onIntentPick = vi.fn();

    render(
      <SessionView
        {...baseProps}
        sessionDurationPick={10}
        sessionIntentPick="regulate"
        onDurationPick={onDurationPick}
        onIntentPick={onIntentPick}
      />,
    );

    await user.click(screen.getByRole("button", { name: "15 min" }));
    expect(onDurationPick).toHaveBeenCalledWith(15);

    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(onIntentPick).toHaveBeenCalledWith("focus");
  });

  it("begins session from the primary control", async () => {
    const user = userEvent.setup();
    const onBeginSession = vi.fn();

    render(<SessionView {...baseProps} onBeginSession={onBeginSession} />);

    await user.click(screen.getByRole("button", { name: "Begin session" }));
    expect(onBeginSession).toHaveBeenCalledTimes(1);
  });

  it("shows end early only while a session is active", async () => {
    const user = userEvent.setup();
    const onEndSession = vi.fn();

    const { rerender } = render(
      <SessionView {...baseProps} sessionActive={false} onEndSession={onEndSession} />,
    );
    expect(screen.queryByRole("button", { name: "End session early" })).toBeNull();

    rerender(<SessionView {...baseProps} sessionActive onEndSession={onEndSession} />);
    await user.click(screen.getByRole("button", { name: "End session early" }));
    expect(onEndSession).toHaveBeenCalledTimes(1);
  });

  it("shows progress panel while session is active with progress", () => {
    render(
      <SessionView
        {...baseProps}
        sessionActive
        sessionDurationPick={10}
        sessionProgress={0.25}
      />,
    );
    expect(screen.getByTestId("session-active-progress")).toBeTruthy();
    expect(screen.getByText(/7:30 left/)).toBeTruthy();
  });
});
