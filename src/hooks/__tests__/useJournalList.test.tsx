import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useJournalList } from "../useJournalList.js";

describe("useJournalList", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true } as Navigator);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests scoped journals URL when sessionId is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderHook(
      ({ show, sid }: { show: boolean; sid: string | null }) => useJournalList(show, sid),
      {
        initialProps: { show: false, sid: null as string | null },
      },
    );

    rerender({ show: true, sid: "sessionsess12" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/journals?sessionId=sessionsess12", undefined);
    });
  });

  it("requests unscoped journals when sessionId is null", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useJournalList(true, null));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/journals", undefined);
    });
  });
});
