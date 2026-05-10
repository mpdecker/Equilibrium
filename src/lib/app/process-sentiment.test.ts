import { describe, it, expect, vi, beforeEach } from "vitest";
import { processSentiment } from "./process-sentiment";
import { defaultParams, defaultSettings } from "../synth";

vi.mock("../api-fetch", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../sync-queue", () => ({
  newMutationId: () => "test-mutation-id",
  postJournalOrQueue: vi.fn(() => Promise.resolve()),
}));

import { apiFetch } from "../api-fetch";
import { postJournalOrQueue } from "../sync-queue";

describe("processSentiment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  });

  it("queues journal and returns offline fallback when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const refreshOutboxCount = vi.fn().mockResolvedValue(undefined);
    const result = await processSentiment("anxious", defaultParams, defaultSettings, {
      getSoundSessionId: () => "sess-1",
      refreshOutboxCount,
    });
    expect(result.params).toEqual(defaultParams);
    expect(result.explainLine).toMatch(/offline/i);
    expect(postJournalOrQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "anxious",
        moodText: "anxious",
        sessionId: "sess-1",
      }),
    );
    expect(refreshOutboxCount).toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("returns current params when API responds not ok", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);
    const result = await processSentiment("hello", defaultParams, defaultSettings, {
      getSoundSessionId: () => null,
      refreshOutboxCount: vi.fn().mockResolvedValue(undefined),
    });
    expect(result.params).toEqual(defaultParams);
    expect(result.feedbackPrompt.question).toBe("How is this space feeling?");
  });

  it("returns parsed JSON on success", async () => {
    const body = {
      params: { ...defaultParams, masterVolume: 0.5 },
      feedbackPrompt: { question: "Q?", options: ["a"] },
    };
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => body,
    } as Response);
    const result = await processSentiment("hello", defaultParams, defaultSettings, {
      getSoundSessionId: () => null,
      refreshOutboxCount: vi.fn().mockResolvedValue(undefined),
    });
    expect(result.params).toEqual(body.params);
    expect(result.feedbackPrompt).toEqual(body.feedbackPrompt);
  });
});
