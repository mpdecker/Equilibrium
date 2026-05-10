import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getServerAudioEnginePreference,
  getServerInstrumentMode,
  resolveEffectiveServerEngine,
  isAudioShadowModeEnabled,
} from "./feature-flags.js";

describe("feature-flags", () => {
  const backup: Record<string, string | undefined> = {};

  function stash(keys: string[]) {
    for (const k of keys) {
      backup[k] = process.env[k];
    }
  }

  function restore(keys: string[]) {
    for (const k of keys) {
      const v = backup[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  beforeEach(() => {
    stash(["AUDIO_SHADOW_MODE", "AUDIO_ENGINE", "AUDIO_ENGINE_AUTO_WASM", "INSTRUMENT_MODE"]);
  });

  afterEach(() => {
    restore(["AUDIO_SHADOW_MODE", "AUDIO_ENGINE", "AUDIO_ENGINE_AUTO_WASM", "INSTRUMENT_MODE"]);
  });

  it("detects shadow mode", () => {
    delete process.env.AUDIO_SHADOW_MODE;
    expect(isAudioShadowModeEnabled()).toBe(false);
    process.env.AUDIO_SHADOW_MODE = "1";
    expect(isAudioShadowModeEnabled()).toBe(true);
    process.env.AUDIO_SHADOW_MODE = "true";
    expect(isAudioShadowModeEnabled()).toBe(true);
  });

  it("parses AUDIO_ENGINE preference", () => {
    delete process.env.AUDIO_ENGINE;
    expect(getServerAudioEnginePreference()).toBe("tone");
    process.env.AUDIO_ENGINE = "STUB";
    expect(getServerAudioEnginePreference()).toBe("stub");
    process.env.AUDIO_ENGINE = "auto";
    expect(getServerAudioEnginePreference()).toBe("auto");
  });

  it("parses wasm AUDIO_ENGINE preference", () => {
    process.env.AUDIO_ENGINE = "WASM";
    expect(getServerAudioEnginePreference()).toBe("wasm");
    delete process.env.AUDIO_ENGINE;
  });

  it("resolves effective engine including auto rollout preference", () => {
    process.env.AUDIO_ENGINE = "stub";
    expect(resolveEffectiveServerEngine()).toBe("stub");
    process.env.AUDIO_ENGINE = "wasm";
    expect(resolveEffectiveServerEngine()).toBe("wasm");
    process.env.AUDIO_ENGINE = "auto";
    expect(resolveEffectiveServerEngine()).toBe("wasm");
    process.env.AUDIO_ENGINE_AUTO_WASM = "0";
    expect(resolveEffectiveServerEngine()).toBe("tone");
    delete process.env.AUDIO_ENGINE_AUTO_WASM;
    delete process.env.AUDIO_ENGINE;
    expect(resolveEffectiveServerEngine()).toBe("tone");
  });

  it("parses INSTRUMENT_MODE for rollout", () => {
    delete process.env.INSTRUMENT_MODE;
    expect(getServerInstrumentMode()).toBe("auto");
    process.env.INSTRUMENT_MODE = "stage";
    expect(getServerInstrumentMode()).toBe("stage");
    process.env.INSTRUMENT_MODE = "FORM";
    expect(getServerInstrumentMode()).toBe("form");
    process.env.INSTRUMENT_MODE = "bogus";
    expect(getServerInstrumentMode()).toBe("auto");
  });
});
