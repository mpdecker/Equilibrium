import { describe, expect, it } from "vitest";
import { MOTION, SCALE, withReducedMotion } from "./motion-system";

describe("MOTION constants", () => {
  it("provides springs for instrument, surface, and accent groups", () => {
    expect(MOTION.instrument.drag.type).toBe("spring");
    expect(MOTION.surface.drawer.type).toBe("spring");
    expect(MOTION.accent.hover.type).toBe("spring");
  });

  it("settle is a tween for release-ramp animations", () => {
    expect(MOTION.instrument.settle).toMatchObject({ duration: expect.any(Number) });
  });

  it("surface hint and collapse tweens exist", () => {
    expect(MOTION.surface.hint.duration).toBeGreaterThan(0);
    expect(MOTION.surface.collapse.duration).toBeGreaterThan(0);
  });

  it("reduced.instant has zero duration", () => {
    expect(MOTION.reduced.instant.duration).toBe(0);
  });
});

describe("SCALE constants", () => {
  it("hover > 1 and tap < 1", () => {
    expect(SCALE.hover).toBeGreaterThan(1);
    expect(SCALE.tap).toBeLessThan(1);
  });
});

describe("withReducedMotion", () => {
  it("returns the original transition when reduced motion is off", () => {
    const t = withReducedMotion(MOTION.instrument.drag, false);
    expect(t).toBe(MOTION.instrument.drag);
  });

  it("returns the instant tween when reduced motion is on", () => {
    const t = withReducedMotion(MOTION.instrument.drag, true);
    expect(t).toBe(MOTION.reduced.instant);
  });
});
