import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppHeader } from "../AppHeader";

describe("AppHeader", () => {
  const baseProps = {
    netOnline: true,
    outboxPending: 0,
    outboxSyncing: false,
    showJournal: false,
    showAudioLab: false,
    onWrite: vi.fn(),
    onToggleJournal: vi.fn(),
    onOpenAudioLab: vi.fn(),
  };

  it("invokes Write, History toggle, and Audio Lab callbacks", async () => {
    const user = userEvent.setup();
    const onWrite = vi.fn();
    const onToggleJournal = vi.fn();
    const onOpenAudioLab = vi.fn();

    render(
      <AppHeader
        {...baseProps}
        onWrite={onWrite}
        onToggleJournal={onToggleJournal}
        onOpenAudioLab={onOpenAudioLab}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Write" }));
    await user.click(screen.getByRole("button", { name: "History" }));
    await user.click(screen.getByRole("button", { name: "Open audio lab" }));

    expect(onWrite).toHaveBeenCalledTimes(1);
    expect(onToggleJournal).toHaveBeenCalledTimes(1);
    expect(onOpenAudioLab).toHaveBeenCalledTimes(1);
  });

  it("shows offline and outbox copy when disconnected or pending", () => {
    const { rerender } = render(<AppHeader {...baseProps} netOnline={false} />);
    expect(
      screen.getByText(/offline — playback uses your last saved soundscape/i),
    ).toBeTruthy();

    rerender(<AppHeader {...baseProps} netOnline outboxPending={3} />);
    expect(screen.getByText(/3 entries waiting to sync/i)).toBeTruthy();

    rerender(<AppHeader {...baseProps} outboxSyncing />);
    expect(screen.getByText(/syncing queued notes/i)).toBeTruthy();
  });
});
