import { describe, expect, it, beforeEach } from "vitest";
import {
  parseRolloutInstrumentValue,
  readDrawerDefault,
  readInstrumentMode,
  resolveInstrumentMode,
  writeDrawerDefault,
  writeInstrumentMode,
} from "./feature-flag";

describe("instrument mode feature flag", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("equilibrium.instrument.mode");
      localStorage.removeItem("equilibrium.instrument.drawerOpen");
    } catch {
      /* ignore */
    }
  });

  it("defaults to 'stage' when no preference exists", () => {
    expect(readInstrumentMode()).toBe("stage");
  });

  it("respects an explicit localStorage choice", () => {
    writeInstrumentMode("form");
    expect(readInstrumentMode()).toBe("form");
    writeInstrumentMode("stage");
    expect(readInstrumentMode()).toBe("stage");
  });

  it("URL param overrides localStorage", () => {
    writeInstrumentMode("form");
    const original = window.location.search;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, search: "?instrument=stage" },
    });
    try {
      expect(readInstrumentMode()).toBe("stage");
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, search: original },
      });
    }
  });

  it("ignores invalid URL param values", () => {
    writeInstrumentMode("form");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, search: "?instrument=bogus" },
    });
    try {
      expect(readInstrumentMode()).toBe("form");
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, search: "" },
      });
    }
  });
});

describe("resolveInstrumentMode (full chain incl. server)", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("equilibrium.instrument.mode");
    } catch {
      /* ignore */
    }
  });

  it("prefers URL over server hint", () => {
    const original = window.location.search;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, search: "?instrument=stage" },
    });
    try {
      expect(
        resolveInstrumentMode({ serverInstrument: "form" }),
      ).toEqual({ mode: "stage", source: "url" });
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, search: original },
      });
    }
  });

  it("prefers localStorage over server hint", () => {
    writeInstrumentMode("form");
    expect(resolveInstrumentMode({ serverInstrument: "stage" })).toEqual({
      mode: "form",
      source: "storage",
    });
  });

  it("honors server when no URL, storage, or Vite pin", () => {
    expect(resolveInstrumentMode({ serverInstrument: "form" })).toEqual({
      mode: "form",
      source: "server",
    });
  });

  it("defaults to stage when server is auto or unknown", () => {
    expect(resolveInstrumentMode({ serverInstrument: "auto" })).toEqual({
      mode: "stage",
      source: "default",
    });
    expect(resolveInstrumentMode({ serverInstrument: "nope" })).toEqual({
      mode: "stage",
      source: "default",
    });
  });
});

describe("parseRolloutInstrumentValue", () => {
  it("parses rollout instrument field", () => {
    expect(parseRolloutInstrumentValue("stage")).toBe("stage");
    expect(parseRolloutInstrumentValue("form")).toBe("form");
    expect(parseRolloutInstrumentValue("auto")).toBe("auto");
    expect(parseRolloutInstrumentValue(undefined)).toBeNull();
    expect(parseRolloutInstrumentValue(true)).toBeNull();
  });
});

describe("drawer default", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("equilibrium.instrument.drawerOpen");
    } catch {
      /* ignore */
    }
  });

  it("defaults to 'closed' when no preference exists", () => {
    expect(readDrawerDefault()).toBe("closed");
  });

  it("round-trips via write/read", () => {
    writeDrawerDefault("open");
    expect(readDrawerDefault()).toBe("open");
    writeDrawerDefault("closed");
    expect(readDrawerDefault()).toBe("closed");
  });
});
