import { describe, expect, it } from "vitest";
import {
  VS,
  SURFACE,
  DENSITY,
  TYPE,
  INSTRUMENT_TOKEN,
  scrimClass,
  selectedSurfaceClass,
  surfaceClass,
} from "./visual-system";

describe("visual-system VS (legacy)", () => {
  it("preserves the original public fields used across the app", () => {
    // These are referenced by many components and removing them would be a breaking change.
    expect(VS.label).toBeDefined();
    expect(VS.labelSticky).toBeDefined();
    expect(VS.panel).toBeDefined();
    expect(VS.panelInset).toBeDefined();
    expect(VS.bodyMuted).toBeDefined();
    expect(VS.pillGhost).toBeDefined();
    expect(VS.pillAccent).toBeDefined();
  });
});

describe("visual-system SURFACE", () => {
  it("exposes base, raised, float, selected, and scrim layers", () => {
    expect(SURFACE.base).toBeDefined();
    expect(SURFACE.raised).toBeDefined();
    expect(SURFACE.float).toBeDefined();
    expect(SURFACE.selected.bg).toBeDefined();
    expect(SURFACE.scrim.soft.bg).toBeDefined();
    expect(SURFACE.scrim.default.bg).toBeDefined();
    expect(SURFACE.scrim.dense.bg).toBeDefined();
  });

  it("base/raised include interactive hover variants", () => {
    expect(SURFACE.base.interactive).toMatch(/hover:/);
    expect(SURFACE.raised.interactive).toMatch(/hover:/);
  });

  it("float includes a shadow", () => {
    expect(SURFACE.float.shadow).toMatch(/shadow-\[/);
  });

  it("meter exposes a track class for progress rails", () => {
    expect(SURFACE.meter.track).toMatch(/bg-white/);
  });
});

describe("visual-system DENSITY", () => {
  it("provides comfortable and compact density variants", () => {
    expect(DENSITY.comfortable.panelPad).toBeDefined();
    expect(DENSITY.compact.panelPad).toBeDefined();
    expect(DENSITY.comfortable.panelPad).not.toBe(DENSITY.compact.panelPad);
  });
});

describe("visual-system TYPE scale", () => {
  it("provides a 4-step ramp + numeric readout + muted subheading", () => {
    expect(TYPE.display).toMatch(/font-serif/);
    expect(TYPE.heading).toMatch(/font-serif/);
    expect(TYPE.subheading).toMatch(/font-light/);
    expect(TYPE.subheadingMuted).toMatch(/text-white\/45/);
    expect(TYPE.eyebrow).toMatch(/uppercase/);
    expect(TYPE.numeric).toMatch(/tabular-nums/);
  });
});

describe("visual-system INSTRUMENT_TOKEN", () => {
  it("exposes cursor / focus / wheel tokens as raw color values", () => {
    expect(INSTRUMENT_TOKEN.cursorAura).toMatch(/^rgba/);
    expect(INSTRUMENT_TOKEN.cursorTrail).toMatch(/^rgba/);
    expect(INSTRUMENT_TOKEN.focusAura).toMatch(/^0 0 0/);
    expect(INSTRUMENT_TOKEN.wheelStroke).toMatch(/^rgba/);
    expect(INSTRUMENT_TOKEN.wheelStrokeActive).toMatch(/^rgba/);
  });

  it("exposes a section divider class string", () => {
    expect(INSTRUMENT_TOKEN.dividerClass).toMatch(/border-t/);
  });
});

describe("surfaceClass helper", () => {
  it("composes bg, border, and interactive classes from a tier", () => {
    const cls = surfaceClass(SURFACE.raised, "rounded-2xl p-4");
    expect(cls).toContain("rounded-2xl");
    expect(cls).toContain(SURFACE.raised.bg);
    expect(cls).toContain("border");
  });

  it("includes shadow when tier provides one", () => {
    const cls = surfaceClass(SURFACE.float);
    expect(cls).toContain("shadow-[");
  });
});

describe("selectedSurfaceClass + scrimClass", () => {
  it("composes glow selected chips", () => {
    expect(selectedSurfaceClass("rounded-xl")).toContain(SURFACE.selected.glow);
    expect(selectedSurfaceClass()).toContain("border-eq-glow");
  });

  it("composes overlay scrims", () => {
    expect(scrimClass("soft")).toContain(SURFACE.scrim.soft.bg);
    expect(scrimClass("dense")).toContain("backdrop-blur");
  });
});
