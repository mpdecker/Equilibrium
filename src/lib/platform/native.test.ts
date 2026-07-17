import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isNativeApp, pulseSessionCheckpoint } from "./native.js";

describe("platform/native", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("isNativeApp is false without Capacitor global", () => {
    expect(isNativeApp()).toBe(false);
  });

  it("isNativeApp reads Capacitor.isNativePlatform", () => {
    vi.stubGlobal("Capacitor", { isNativePlatform: () => true });
    expect(isNativeApp()).toBe(true);
  });

  it("pulseSessionCheckpoint falls back to navigator.vibrate on web", async () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    await pulseSessionCheckpoint(14);
    expect(vibrate).toHaveBeenCalledWith(14);
  });
});
