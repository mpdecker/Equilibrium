/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createToneMock } from "../../../__tests__/mocks/tone";

vi.mock("tone", () => createToneMock());

import App from "../../../App";

function setupFetchMock() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
  );
}

describe("Instrument mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try {
      localStorage.setItem("equilibrium.instrument.mode", "stage");
      localStorage.removeItem("equilibrium.instrument.drawerOpen");
      // Skip first-run walkthrough so tests can interact with the stage directly.
      localStorage.setItem("equilibrium.firstRun.completed", "true");
    } catch {
      /* ignore */
    }
    setupFetchMock();
  });

  it("renders the EQUILIBRIUM brand even in instrument mode", () => {
    render(<App />);
    expect(screen.getByText("EQUILIBRIUM")).toBeTruthy();
  });

  it("does NOT render the mood input by default (drawer closed)", () => {
    render(<App />);
    expect(screen.queryByPlaceholderText(/overwhelmed with work/i)).toBeNull();
  });

  it("opens the drawer and reveals the mood input when 'M' is pressed", async () => {
    render(<App />);
    expect(screen.queryByPlaceholderText(/overwhelmed with work/i)).toBeNull();

    await userEvent.keyboard("m");

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/overwhelmed with work/i)).toBeTruthy();
    });
  });

  it("opens the drawer when the edge trigger is clicked", async () => {
    render(<App />);
    const opener = screen.getByRole("button", { name: /open compose drawer/i });
    expect(opener).toBeTruthy();

    await userEvent.click(opener);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/overwhelmed with work/i)).toBeTruthy();
    });
  });

  it("renders the play/now-playing dock", () => {
    render(<App />);
    const playButtons = screen.getAllByRole("button", { name: /play/i });
    expect(playButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes the gesture stage as role=application", () => {
    const { container } = render(<App />);
    const stage = container.querySelector('[role="application"]');
    expect(stage).toBeTruthy();
  });
});
