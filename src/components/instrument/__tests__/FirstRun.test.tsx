/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  FirstRun,
  readFirstRunCompleted,
  writeFirstRunCompleted,
} from "../FirstRun";

beforeEach(() => {
  try {
    localStorage.removeItem("equilibrium.firstRun.completed");
  } catch {
    /* ignore */
  }
});

describe("FirstRun walkthrough", () => {
  it("opens by default for new users", () => {
    render(<FirstRun prefersReducedMotion />);
    expect(screen.getByText("This is the breath.")).toBeTruthy();
  });

  it("does not open for users who completed it", () => {
    writeFirstRunCompleted(true);
    render(<FirstRun prefersReducedMotion />);
    expect(screen.queryByText("This is the breath.")).toBeNull();
  });

  it("advances through 3 steps and then completes", async () => {
    const onComplete = vi.fn();
    render(<FirstRun prefersReducedMotion onComplete={onComplete} />);

    expect(screen.getByText("This is the breath.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /i see it/i }));

    expect(screen.getByText("This is your voice.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /^continue/i }));

    expect(screen.getByText("This is your time.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /^begin/i }));

    await waitFor(() => {
      expect(screen.queryByText("This is your time.")).toBeNull();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(readFirstRunCompleted()).toBe(true);
  });

  it("Skip closes immediately and marks as completed", async () => {
    const onComplete = vi.fn();
    render(<FirstRun prefersReducedMotion onComplete={onComplete} />);

    await userEvent.click(screen.getByRole("button", { name: /skip walkthrough/i }));

    await waitFor(() => {
      expect(screen.queryByText("This is the breath.")).toBeNull();
    });
    expect(readFirstRunCompleted()).toBe(true);
  });

  it("forceOpen overrides the localStorage flag", () => {
    writeFirstRunCompleted(true);
    render(<FirstRun prefersReducedMotion forceOpen />);
    expect(screen.getByText("This is the breath.")).toBeTruthy();
  });

  it("crisis-support link appears on the final step", async () => {
    render(<FirstRun prefersReducedMotion />);
    await userEvent.click(screen.getByRole("button", { name: /i see it/i }));
    await userEvent.click(screen.getByRole("button", { name: /^continue/i }));

    const crisisLink = screen.getByText(/988 Suicide & Crisis Lifeline/i);
    expect(crisisLink.closest("a")?.getAttribute("href")).toMatch(/988lifeline/i);
  });
});
