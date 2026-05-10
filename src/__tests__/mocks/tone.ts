import { vi } from 'vitest';

export function createToneMock() {
  return {
    Reverb: class {
      wet = { value: 0, rampTo: vi.fn() };
      decay = { value: 1, rampTo: vi.fn() };
      dispose = vi.fn();
      generate = vi.fn().mockResolvedValue(undefined);
      connect = vi.fn().mockReturnThis();
      toDestination = vi.fn().mockReturnThis();
    },
    FeedbackDelay: class {
      delayTime = { value: '4n', rampTo: vi.fn() };
      feedback = { value: 0.4, rampTo: vi.fn() };
      wet = { value: 0, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    Filter: class {
      frequency = { value: 200, rampTo: vi.fn() };
      Q = { value: 1, rampTo: vi.fn() };
      type = 'lowpass';
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    Chorus: class {
      frequency = { value: 0.5, rampTo: vi.fn() };
      depth = { value: 0.5, rampTo: vi.fn() };
      wet = { value: 0, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
      start = vi.fn().mockReturnThis();
      stop = vi.fn().mockReturnThis();
    },
    Phaser: class {
      frequency = { value: 0.5, rampTo: vi.fn() };
      baseFrequency = { value: 100, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    AutoPanner: class {
      frequency = { value: 0.05, rampTo: vi.fn() };
      depth = { value: 1, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
      start = vi.fn().mockReturnThis();
      stop = vi.fn().mockReturnThis();
    },
    Vibrato: class {
      frequency = { value: 0.5, rampTo: vi.fn() };
      depth = { value: 0.5, rampTo: vi.fn() };
      wet = { value: 0, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    Chebyshev: class {
      order = { value: 51 };
      wet = { value: 0, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    PitchShift: class {
      pitch = { value: 0, rampTo: vi.fn() };
      windowSize = { value: 0.1 };
      delayTime = { value: 0, rampTo: vi.fn() };
      feedback = { value: 0.2, rampTo: vi.fn() };
      wet = { value: 0, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    LFO: class {
      frequency = { value: 0.1, rampTo: vi.fn() };
      min = 200;
      max = 800;
      start = vi.fn().mockReturnThis();
      stop = vi.fn().mockReturnThis();
      connect = vi.fn().mockReturnThis();
      dispose = vi.fn();
    },
    Compressor: class {
      threshold = { value: -24, rampTo: vi.fn() };
      ratio = { value: 12 };
      attack = { value: 0.003 };
      release = { value: 0.25 };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    Limiter: class {
      threshold = { value: -0.5, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
      toDestination = vi.fn().mockReturnThis();
    },
    Analyser: class {
      type = 'waveform';
      size = 256;
      getValue = vi.fn().mockReturnValue(new Float32Array(256));
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    Gain: class {
      gain = { value: 1, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    Panner: class {
      pan = { value: 0, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
    },
    PolySynth: class {
      constructor() {
        return Object.assign(this, {
          triggerAttackRelease: vi.fn(),
          releaseAll: vi.fn(),
          set: vi.fn(),
          dispose: vi.fn(),
          connect: vi.fn().mockReturnThis(),
          chain: vi.fn().mockReturnThis(),
          volume: { value: 0, rampTo: vi.fn() },
          oscillator: { type: 'sine' },
          envelope: { attack: 0.1, release: 0.1 },
          harmonicity: { value: 2 },
          modulationIndex: { value: 2 },
          noise: { type: 'pink' },
        });
      }
    },
    Synth: class {
      constructor() {
        return Object.assign(this, {
          triggerAttackRelease: vi.fn(),
          releaseAll: vi.fn(),
          set: vi.fn(),
          dispose: vi.fn(),
          connect: vi.fn().mockReturnThis(),
          chain: vi.fn().mockReturnThis(),
          volume: { value: 0, rampTo: vi.fn() },
          oscillator: { type: 'sine' },
          envelope: { attack: 0.1, release: 0.1 },
        });
      }
    },
    AMSynth: class {
      connect = vi.fn().mockReturnThis();
      chain = vi.fn().mockReturnThis();
      volume = { value: 0, rampTo: vi.fn() };
      dispose = vi.fn();
    },
    FMSynth: class {
      connect = vi.fn().mockReturnThis();
      chain = vi.fn().mockReturnThis();
      volume = { value: 0, rampTo: vi.fn() };
      dispose = vi.fn();
    },
    MetalSynth: class {
      constructor() {
        return Object.assign(this, {
          triggerAttackRelease: vi.fn(),
          releaseAll: vi.fn(),
          set: vi.fn(),
          dispose: vi.fn(),
          connect: vi.fn().mockReturnThis(),
          chain: vi.fn().mockReturnThis(),
          volume: { value: 0, rampTo: vi.fn() },
          envelope: { attack: 0.1, release: 0.1 },
          harmonicity: { value: 5.1 },
          modulationIndex: { value: 32 },
          resonance: { value: 4000 },
        });
      }
    },
    Noise: class {
      type = 'pink';
      volume = { value: 0, rampTo: vi.fn() };
      start = vi.fn().mockReturnThis();
      stop = vi.fn().mockReturnThis();
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
      chain = vi.fn().mockReturnThis();
    },
    AutoFilter: class {
      frequency = { value: '8m' as any, rampTo: vi.fn() };
      filter = { type: 'lowpass' };
      wet = { value: 0, rampTo: vi.fn() };
      dispose = vi.fn();
      connect = vi.fn().mockReturnThis();
      start = vi.fn().mockReturnThis();
      stop = vi.fn().mockReturnThis();
    },
    NoiseSynth: class {
      constructor() {
        return Object.assign(this, {
          triggerAttackRelease: vi.fn(),
          releaseAll: vi.fn(),
          set: vi.fn(),
          dispose: vi.fn(),
          connect: vi.fn().mockReturnThis(),
          chain: vi.fn().mockReturnThis(),
          volume: { value: 0, rampTo: vi.fn() },
          noise: { type: 'pink' },
        });
      }
    },
    Loop: class {
      callback: (time: number) => void;
      constructor(cb: (time: number) => void) {
        this.callback = cb;
      }
      start = vi.fn();
      stop = vi.fn();
      dispose = vi.fn();
    },
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
      cancel: vi.fn(),
      bpm: { value: 60, rampTo: vi.fn() },
    },
    Destination: { volume: { value: 0, rampTo: vi.fn() } },
    Master: { volume: { value: 0 } },
    start: vi.fn().mockResolvedValue(undefined),
    context: { resume: vi.fn().mockResolvedValue(undefined) },
    now: vi.fn().mockReturnValue(0),
    loaded: vi.fn().mockResolvedValue(undefined),
    TransportEvent: class {},
    Draw: { schedule: vi.fn(), cancel: vi.fn() },
    Time: vi.fn().mockReturnValue('0:0'),
    Frequency: vi.fn().mockImplementation((n: number) => ({ toMidi: vi.fn(), toFrequency: vi.fn() })),
    connect: vi.fn().mockReturnThis(),
    connectSeries: vi.fn().mockReturnThis(),
    immediate: vi.fn().mockReturnThis(),
    dbToGain: vi.fn().mockReturnValue(0),
    gainToDb: vi.fn().mockReturnValue(0),
  };
}
