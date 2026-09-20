import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WorkletAmbientEngine } from "./worklet-ambient-engine";
import { defaultParams, defaultSettings } from "../music-schema";

/**
 * jsdom has no Web Audio implementation, so these tests install a minimal
 * fake `AudioContext` / `AudioWorkletNode` on `globalThis` for the duration
 * of each test. The fake is deliberately controllable (its `audioWorklet.
 * addModule` can be told to reject) so we can exercise both the happy path
 * and — critically — the silent-fallback path, which shipped with zero test
 * coverage (the previous version of this file was a placeholder assertion).
 */

type FakeAudioContextOptions = {
  addModuleShouldReject?: boolean;
  resumeShouldReject?: boolean;
};

function installFakeAudioApis(opts: FakeAudioContextOptions = {}) {
  class FakeAudioParam {
    value = 0;
  }
  class FakeAudioNode {
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
  }
  class FakeGainNode extends FakeAudioNode {
    gain = new FakeAudioParam();
  }
  class FakeAnalyserNode extends FakeAudioNode {
    fftSize = 2048;
    getFloatTimeDomainData = vi.fn();
  }
  class FakeAudioWorkletNode extends FakeAudioNode {
    port = { postMessage: vi.fn() };
    constructor(_ctx: unknown, name: string) {
      super();
      if (name !== "equilibrium-dsp") throw new Error(`unexpected processor name: ${name}`);
    }
  }
  class FakeAudioContext {
    state: "running" | "suspended" | "closed" = "suspended";
    destination = new FakeAudioNode();
    audioWorklet = {
      addModule: vi.fn().mockImplementation(() =>
        opts.addModuleShouldReject
          ? Promise.reject(new Error("addModule failed (simulated)"))
          : Promise.resolve(undefined),
      ),
    };
    createAnalyser = vi.fn().mockImplementation(() => new FakeAnalyserNode());
    createGain = vi.fn().mockImplementation(() => new FakeGainNode());
    resume = vi.fn().mockImplementation(() => {
      if (opts.resumeShouldReject) return Promise.reject(new Error("resume failed (simulated)"));
      this.state = "running";
      return Promise.resolve(undefined);
    });
    suspend = vi.fn().mockImplementation(() => {
      this.state = "suspended";
      return Promise.resolve(undefined);
    });
    close = vi.fn().mockImplementation(() => {
      this.state = "closed";
      return Promise.resolve(undefined);
    });
  }

  const g = globalThis as unknown as {
    AudioContext: unknown;
    AudioWorkletNode: unknown;
  };
  g.AudioContext = FakeAudioContext;
  g.AudioWorkletNode = FakeAudioWorkletNode;
  return { FakeAudioContext };
}

function uninstallFakeAudioApis() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.AudioContext;
  delete g.AudioWorkletNode;
}

describe("WorkletAmbientEngine", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    uninstallFakeAudioApis();
    errorSpy.mockRestore();
  });

  it("starts the real AudioWorklet graph on the happy path and produces a live analyser", async () => {
    installFakeAudioApis();
    const engine = new WorkletAmbientEngine({ workletModuleUrl: "/worklets/equilibrium-dsp-processor.js" });

    await engine.start();

    const analyser = engine.getAnalyser();
    expect(analyser).toBeDefined();
    // Happy path never logs — only the fallback path should.
    expect(errorSpy).not.toHaveBeenCalled();

    engine.stop();
    engine.dispose();
  });

  it("falls back to the silent PreviewAmbientEngine and logs when addModule rejects", async () => {
    installFakeAudioApis({ addModuleShouldReject: true });
    const engine = new WorkletAmbientEngine({ workletModuleUrl: "/worklets/equilibrium-dsp-processor.js" });

    await engine.start();

    // This is the regression this test guards: a worklet failure must not be
    // completely silent to developers/observability, even though the engine
    // intentionally keeps the app itself from crashing.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("falling back to silent preview engine"),
      expect.any(Error),
    );

    // The engine still reports "playing" and hands back a working analyser —
    // that's the intended graceful-degradation contract — but audibly the
    // fallback produces no Web Audio output at all.
    const analyser = engine.getAnalyser();
    expect(analyser.getValue()).toBeInstanceOf(Float32Array);

    engine.stop();
    engine.dispose();
  });

  it("falls back and logs when ctx.resume() rejects (e.g. autoplay policy)", async () => {
    installFakeAudioApis({ resumeShouldReject: true });
    const engine = new WorkletAmbientEngine({ workletModuleUrl: "/worklets/equilibrium-dsp-processor.js" });

    await engine.start();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("falling back to silent preview engine"),
      expect.any(Error),
    );

    engine.stop();
    engine.dispose();
  });

  it("falls back and logs when AudioContext is unavailable entirely", async () => {
    uninstallFakeAudioApis();
    const engine = new WorkletAmbientEngine({ workletModuleUrl: "/worklets/equilibrium-dsp-processor.js" });

    await engine.start();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("falling back to silent preview engine"),
      expect.any(Error),
    );

    engine.stop();
    engine.dispose();
  });

  it("applyParams / applyEvolutionSettings do not throw before or after a fallback", async () => {
    installFakeAudioApis({ addModuleShouldReject: true });
    const engine = new WorkletAmbientEngine({ workletModuleUrl: "/worklets/equilibrium-dsp-processor.js" });

    expect(() => engine.applyParams(defaultParams)).not.toThrow();
    expect(() => engine.applyEvolutionSettings(defaultSettings)).not.toThrow();

    await engine.start();

    expect(() => engine.applyParams(defaultParams)).not.toThrow();
    expect(() => engine.applyEvolutionSettings(defaultSettings)).not.toThrow();

    engine.stop();
    engine.dispose();
  });
});
