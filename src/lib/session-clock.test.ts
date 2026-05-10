import { describe, expect, it } from "vitest";
import { formatSessionClockLabels } from "./session-clock";

describe("formatSessionClockLabels", () => {
  it("formats remaining and elapsed mid-session", () => {
    const { elapsedLabel, remainingLabel } = formatSessionClockLabels(0.5, 10);
    expect(elapsedLabel).toBe("5:00");
    expect(remainingLabel).toBe("5:00 left");
  });

  it("handles start and end caps", () => {
    expect(formatSessionClockLabels(0, 15).remainingLabel).toBe("15:00 left");
    expect(formatSessionClockLabels(1, 15).elapsedLabel).toBe("15:00");
    expect(formatSessionClockLabels(1, 15).remainingLabel).toBe("0:00 left");
  });
});
