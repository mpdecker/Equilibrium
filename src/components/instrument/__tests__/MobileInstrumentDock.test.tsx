/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileInstrumentDock } from "../MobileInstrumentDock";

const baseProps = {
  isPlaying: false,
  isStarting: false,
  statusLine: "Engine paused",
  onTogglePlay: vi.fn(),
  onOpenAudioLab: vi.fn(),
  onOpenDrawer: vi.fn(),
  mainTab: "practice" as const,
  onTabChange: vi.fn(),
  paletteColors: ["#000", "#111", "#222"],
  onOpenPalettes: vi.fn(),
  sessionProgress: null,
  prefersReducedMotion: true,
};

describe("MobileInstrumentDock", () => {
  it("renders the status line and play button by default", () => {
    render(<MobileInstrumentDock {...baseProps} />);
    expect(screen.getByText("Engine paused")).toBeTruthy();
    expect(screen.getByRole("button", { name: /play/i })).toBeTruthy();
  });

  it("starts collapsed (no tab nav visible)", () => {
    render(<MobileInstrumentDock {...baseProps} />);
    expect(screen.queryByRole("button", { name: /^session$/i })).toBeNull();
  });

  it("expands to reveal tab nav and lab/palette controls", async () => {
    render(<MobileInstrumentDock {...baseProps} />);

    const expand = screen.getByRole("button", { name: /expand dock/i });
    await userEvent.click(expand);

    expect(screen.getByRole("button", { name: /practice/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^session$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /reflect/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /lab/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /change color palette/i })).toBeTruthy();
  });

  it("clicking a tab calls onTabChange and onOpenDrawer", async () => {
    const onTabChange = vi.fn();
    const onOpenDrawer = vi.fn();
    render(
      <MobileInstrumentDock {...baseProps} onTabChange={onTabChange} onOpenDrawer={onOpenDrawer} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /expand dock/i }));
    await userEvent.click(screen.getByRole("button", { name: /^session$/i }));

    expect(onTabChange).toHaveBeenCalledWith("session");
    expect(onOpenDrawer).toHaveBeenCalled();
  });

  it("renders a session progress ring when sessionProgress is provided", () => {
    render(<MobileInstrumentDock {...baseProps} sessionProgress={0.5} />);
    expect(screen.getByTestId("session-ring")).toBeTruthy();
  });

  it("does not render the progress ring when sessionProgress is null", () => {
    render(<MobileInstrumentDock {...baseProps} sessionProgress={null} />);
    expect(screen.queryByTestId("session-ring")).toBeNull();
  });
});
