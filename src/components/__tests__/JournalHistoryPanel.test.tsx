import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { JournalHistoryPanel } from "../JournalHistoryPanel";

describe("JournalHistoryPanel", () => {
  it("renders the empty journal state", () => {
    render(<JournalHistoryPanel journals={[]} />);

    expect(screen.getByText("Recent Entries")).toBeTruthy();
    expect(screen.getByText("No entries yet.")).toBeTruthy();
  });

  it("marks pending sync entries", () => {
    render(
      <JournalHistoryPanel
        journals={[
          {
            id: "pending-1",
            content: "Saved offline for later",
            createdAt: "2026-05-08T20:00:00.000Z",
            pendingSync: true,
          },
        ]}
      />,
    );

    expect(screen.getByText("Saved offline for later")).toBeTruthy();
    expect(screen.getByText("Pending sync")).toBeTruthy();
  });
});
