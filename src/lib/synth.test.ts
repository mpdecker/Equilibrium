import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createToneMock } from '../__tests__/mocks/tone';

vi.mock('tone', () => createToneMock());

import { AmbientEngine, defaultParams, defaultSettings } from './synth';

describe('defaultParams', () => {
  it('has all expected shape properties', () => {
    const keys = Object.keys(defaultParams);
    expect(keys).toContain('baseFrequency');
    expect(keys).toContain('chordIntervals');
    expect(keys).toContain('filterCutoffMax');
    expect(keys).toContain('lfoSpeed');
    expect(keys).toContain('reverbWet');
    expect(keys).toContain('reverbDecay');
    expect(keys).toContain('volume');
    expect(keys).toContain('droneVolume');
    expect(keys).toContain('padVolume');
    expect(keys).toContain('arpVolume');
    expect(keys).toContain('bellVolume');
    expect(keys).toContain('subVolume');
    expect(keys).toContain('colorPalette');
    expect(keys).toContain('oscillatorType');
    expect(keys).toContain('harmonicity');
    expect(keys).toContain('modulationIndex');
    expect(keys).toContain('noiseAmount');
    expect(keys).toContain('noiseType');
    expect(keys).toContain('delayTime');
    expect(keys).toContain('delayFeedback');
    expect(keys).toContain('complexity');
    expect(keys).toContain('attackTime');
    expect(keys).toContain('releaseTime');
    expect(keys).toContain('chorusDepth');
    expect(keys).toContain('phaserFrequency');
  });

  it('has numeric values within valid ranges', () => {
    expect(defaultParams.baseFrequency).toBeGreaterThanOrEqual(40);
    expect(defaultParams.baseFrequency).toBeLessThanOrEqual(440);
    expect(defaultParams.lfoSpeed).toBeGreaterThanOrEqual(0.01);
    expect(defaultParams.lfoSpeed).toBeLessThanOrEqual(1);
    expect(defaultParams.reverbWet).toBeGreaterThanOrEqual(0);
    expect(defaultParams.reverbWet).toBeLessThanOrEqual(1);
    expect(defaultParams.volume).toBeGreaterThanOrEqual(-40);
    expect(defaultParams.volume).toBeLessThanOrEqual(0);
    expect(defaultParams.harmonicity).toBeGreaterThanOrEqual(0.1);
    expect(defaultParams.harmonicity).toBeLessThanOrEqual(5.0);
    expect(defaultParams.complexity).toBeGreaterThanOrEqual(0);
    expect(defaultParams.complexity).toBeLessThanOrEqual(1);
  });

  it('has colorPalette with exactly 3 elements', () => {
    expect(defaultParams.colorPalette).toHaveLength(3);
  });

  it('has valid enumerated values', () => {
    expect(['sine', 'triangle', 'square', 'sawtooth']).toContain(defaultParams.oscillatorType);
    expect(['white', 'pink', 'brown']).toContain(defaultParams.noiseType);
    expect(['8n', '4n', '2n']).toContain(defaultParams.delayTime);
  });
});

describe('defaultSettings', () => {
  it('has all expected properties', () => {
    expect(defaultSettings).toHaveProperty('timbreDiversity');
    expect(defaultSettings).toHaveProperty('evolutionSpeed');
    expect(defaultSettings).toHaveProperty('feedbackSubtlety');
    expect(defaultSettings).toHaveProperty('particleDensity');
    expect(defaultSettings).toHaveProperty('synthesisEngine');
  });

  it('defaults synthesis engine to tone', () => {
    expect(defaultSettings.synthesisEngine).toBe('tone');
  });

  it('has values within 0-1 range (except particleDensity)', () => {
    expect(defaultSettings.timbreDiversity).toBeGreaterThanOrEqual(0);
    expect(defaultSettings.timbreDiversity).toBeLessThanOrEqual(1);
    expect(defaultSettings.evolutionSpeed).toBeGreaterThanOrEqual(0);
    expect(defaultSettings.evolutionSpeed).toBeLessThanOrEqual(1);
    expect(defaultSettings.feedbackSubtlety).toBeGreaterThanOrEqual(0);
    expect(defaultSettings.feedbackSubtlety).toBeLessThanOrEqual(1);
  });
});

describe('AmbientEngine', () => {
  let engine: AmbientEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new AmbientEngine();
  });

  it('creates an instance with an analyser', () => {
    expect(engine).toBeDefined();
    expect(engine.analyser).toBeDefined();
    expect(engine.analyser.getValue).toBeDefined();
  });

  describe('applyEvolutionSettings', () => {
    it('accepts valid EvolutionSettings', () => {
      expect(() => engine.applyEvolutionSettings({
        timbreDiversity: 0.8,
        evolutionSpeed: 0.3,
        feedbackSubtlety: 0.9,
        particleDensity: 200,
        synthesisEngine: 'tone',
      })).not.toThrow();
    });
  });

  describe('applyParams', () => {
    it('does not throw with default params', () => {
      expect(() => engine.applyParams(defaultParams)).not.toThrow();
    });

    it('does not throw with boundary min values', () => {
      const minParams = {
        ...defaultParams,
        baseFrequency: 40,
        lfoSpeed: 0.01,
        reverbWet: 0,
        reverbDecay: 1,
        volume: -40,
        droneVolume: -60,
        padVolume: -60,
        arpVolume: -60,
        bellVolume: -60,
        subVolume: -60,
        harmonicity: 0.1,
        modulationIndex: 0,
        noiseAmount: 0,
        delayFeedback: 0,
        complexity: 0,
        attackTime: 0.1,
        releaseTime: 0.1,
        chorusDepth: 0,
        phaserFrequency: 0.1,
      };
      expect(() => engine.applyParams(minParams)).not.toThrow();
    });

    it('does not throw with boundary max values', () => {
      const maxParams = {
        ...defaultParams,
        baseFrequency: 440,
        lfoSpeed: 1,
        reverbWet: 1,
        reverbDecay: 20,
        volume: 0,
        droneVolume: 0,
        padVolume: 0,
        arpVolume: 0,
        bellVolume: 0,
        subVolume: 0,
        harmonicity: 5.0,
        modulationIndex: 10.0,
        noiseAmount: 1.0,
        delayFeedback: 0.9,
        complexity: 1,
        attackTime: 10.0,
        releaseTime: 20.0,
        chorusDepth: 1.0,
        phaserFrequency: 10.0,
      };
      expect(() => engine.applyParams(maxParams)).not.toThrow();
    });

    it('does not throw with all valid oscillator types', () => {
      for (const osc of ['sine', 'triangle', 'square', 'sawtooth'] as const) {
        expect(() => engine.applyParams({
          ...defaultParams,
          oscillatorType: osc,
        })).not.toThrow();
      }
    });

    it('does not throw with all valid noise types', () => {
      for (const noise of ['white', 'pink', 'brown'] as const) {
        expect(() => engine.applyParams({
          ...defaultParams,
          noiseType: noise,
        })).not.toThrow();
      }
    });

    it('does not throw with all valid delay times', () => {
      for (const delay of ['8n', '4n', '2n'] as const) {
        expect(() => engine.applyParams({
          ...defaultParams,
          delayTime: delay,
        })).not.toThrow();
      }
    });
  });

  describe('start', () => {
    it('does not throw on start', async () => {
      await expect(engine.start()).resolves.toBeUndefined();
    });
  });

  describe('stop', () => {
    it('does not throw on stop', () => {
      expect(() => engine.stop()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('does not throw when called without start', () => {
      expect(() => engine.dispose()).not.toThrow();
    });

    it('does not throw when called after start', async () => {
      await engine.start();
      expect(() => engine.dispose()).not.toThrow();
    });
  });
});
