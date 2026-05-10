import { describe, it, expect } from 'vitest';
import { validateMusicParams, validateFeedbackPrompt } from './validation';

describe('validateMusicParams', () => {
  it('returns default params when given an empty object', () => {
    const result = validateMusicParams({});
    expect(result.baseFrequency).toBe(100);
    expect(result.chordIntervals).toEqual([0, 7, 12, 16]);
    expect(result.filterCutoffMax).toBe(1500);
    expect(result.lfoSpeed).toBe(0.05);
    expect(result.reverbWet).toBe(0.8);
    expect(result.reverbDecay).toBe(5.0);
    expect(result.volume).toBe(-10);
    expect(result.droneVolume).toBe(-15);
    expect(result.padVolume).toBe(-15);
    expect(result.arpVolume).toBe(-10);
    expect(result.bellVolume).toBe(-8);
    expect(result.subVolume).toBe(-12);
    expect(result.colorPalette).toEqual(['#2d3748', '#1a202c', '#000000']);
    expect(result.oscillatorType).toBe('sine');
    expect(result.harmonicity).toBe(2.0);
    expect(result.modulationIndex).toBe(2.0);
    expect(result.noiseAmount).toBe(0.1);
    expect(result.noiseType).toBe('pink');
    expect(result.delayTime).toBe('4n');
    expect(result.delayFeedback).toBe(0.4);
    expect(result.complexity).toBe(0.5);
    expect(result.attackTime).toBe(4.0);
    expect(result.releaseTime).toBe(8.0);
    expect(result.chorusDepth).toBe(0.5);
    expect(result.phaserFrequency).toBe(0.5);
  });

  it('clamps numeric params to their valid ranges', () => {
    const result = validateMusicParams({
      baseFrequency: 10,
      filterCutoffMax: 100,
      lfoSpeed: 0.001,
      reverbWet: 5,
      reverbDecay: 0,
      volume: 100,
      droneVolume: 100,
      padVolume: 100,
      arpVolume: 100,
      bellVolume: 100,
      subVolume: 100,
      harmonicity: 10,
      modulationIndex: 100,
      noiseAmount: 10,
      delayFeedback: 10,
      complexity: 10,
      attackTime: 0,
      releaseTime: 0,
      chorusDepth: 10,
      phaserFrequency: 0,
    });

    expect(result.baseFrequency).toBe(40);
    expect(result.filterCutoffMax).toBe(200);
    expect(result.lfoSpeed).toBe(0.01);
    expect(result.reverbWet).toBe(1);
    expect(result.reverbDecay).toBe(1);
    expect(result.volume).toBe(0);
    expect(result.droneVolume).toBe(0);
    expect(result.padVolume).toBe(0);
    expect(result.arpVolume).toBe(0);
    expect(result.bellVolume).toBe(0);
    expect(result.subVolume).toBe(0);
    expect(result.harmonicity).toBe(5.0);
    expect(result.modulationIndex).toBe(10.0);
    expect(result.noiseAmount).toBe(1.0);
    expect(result.delayFeedback).toBe(0.9);
    expect(result.complexity).toBe(1);
    expect(result.attackTime).toBe(0.1);
    expect(result.releaseTime).toBe(0.1);
    expect(result.chorusDepth).toBe(1.0);
    expect(result.phaserFrequency).toBe(0.1);
  });

  it('clamps high values to max bounds', () => {
    const result = validateMusicParams({
      baseFrequency: 1000,
      filterCutoffMax: 10000,
      lfoSpeed: 100,
      reverbDecay: 100,
      volume: 100,
    });

    expect(result.baseFrequency).toBe(440);
    expect(result.filterCutoffMax).toBe(5000);
    expect(result.lfoSpeed).toBe(1);
    expect(result.reverbDecay).toBe(20);
    expect(result.volume).toBe(0);
  });

  it('defaults oscillatorType to sine when invalid', () => {
    expect(validateMusicParams({ oscillatorType: 'invalid' }).oscillatorType).toBe('sine');
    expect(validateMusicParams({ oscillatorType: 123 }).oscillatorType).toBe('sine');
    expect(validateMusicParams({ oscillatorType: null }).oscillatorType).toBe('sine');
    expect(validateMusicParams({ oscillatorType: 'sawtooth' }).oscillatorType).toBe('sawtooth');
    expect(validateMusicParams({ oscillatorType: 'triangle' }).oscillatorType).toBe('triangle');
    expect(validateMusicParams({ oscillatorType: 'square' }).oscillatorType).toBe('square');
  });

  it('defaults noiseType to pink when invalid', () => {
    expect(validateMusicParams({ noiseType: 'invalid' }).noiseType).toBe('pink');
    expect(validateMusicParams({ noiseType: 'white' }).noiseType).toBe('white');
    expect(validateMusicParams({ noiseType: 'brown' }).noiseType).toBe('brown');
  });

  it('defaults delayTime to 4n when invalid', () => {
    expect(validateMusicParams({ delayTime: 'invalid' }).delayTime).toBe('4n');
    expect(validateMusicParams({ delayTime: '8n' }).delayTime).toBe('8n');
    expect(validateMusicParams({ delayTime: '2n' }).delayTime).toBe('2n');
  });

  it('validates colorPalette with valid hex colors', () => {
    const valid = ['#ff0000', '#00ff00', '#0000ff'];
    expect(validateMusicParams({ colorPalette: valid }).colorPalette).toEqual(valid);
  });

  it('defaults colorPalette when missing or malformed', () => {
    const fallback = ['#2d3748', '#1a202c', '#000000'];
    expect(validateMusicParams({ colorPalette: ['#fff'] }).colorPalette).toEqual(fallback);
    expect(validateMusicParams({ colorPalette: ['#123456', '#abcdef'] }).colorPalette).toEqual(fallback);
    expect(validateMusicParams({ colorPalette: ['#123456', '#abcdef', 'nothex'] }).colorPalette).toEqual(fallback);
    expect(validateMusicParams({ colorPalette: 'notarray' }).colorPalette).toEqual(fallback);
    expect(validateMusicParams({ colorPalette: null }).colorPalette).toEqual(fallback);
  });

  it('validates chordIntervals as numeric array up to 6 elements', () => {
    expect(validateMusicParams({ chordIntervals: [0, 3, 5, 7, 10, 12, 14] }).chordIntervals).toEqual([0, 3, 5, 7, 10, 12]);
    expect(validateMusicParams({ chordIntervals: [0, 7] }).chordIntervals).toEqual([0, 7]);
    expect(validateMusicParams({ chordIntervals: ['a', 'b'] }).chordIntervals).toEqual([0, 7, 12, 16]);
  });

  it('provides default chordIntervals when none given', () => {
    expect(validateMusicParams({ chordIntervals: [] }).chordIntervals).toEqual([0, 7, 12, 16]);
    expect(validateMusicParams({ chordIntervals: null }).chordIntervals).toEqual([0, 7, 12, 16]);
  });

  it('handles NaN values as fallbacks', () => {
    const result = validateMusicParams({
      baseFrequency: NaN,
      harmonicity: NaN,
    });
    expect(result.baseFrequency).toBe(100);
    expect(result.harmonicity).toBe(2.0);
  });

  it('handles string values for numeric params as fallbacks', () => {
    const result = validateMusicParams({
      baseFrequency: 'notanumber',
      volume: 'loud',
    } as any);
    expect(result.baseFrequency).toBe(100);
    expect(result.volume).toBe(-10);
  });
});

describe('validateFeedbackPrompt', () => {
  it('returns default prompt when given an empty object', () => {
    const result = validateFeedbackPrompt({});
    expect(result.question).toBe('How is this space feeling?');
    expect(result.options).toEqual(['Centering', 'A bit intense', 'Need more uplift']);
  });

  it('returns default prompt when feedbackPrompt is missing', () => {
    const result = validateFeedbackPrompt({ feedbackPrompt: undefined });
    expect(result.question).toBe('How is this space feeling?');
    expect(result.options).toEqual(['Centering', 'A bit intense', 'Need more uplift']);
  });

  it('returns default prompt when feedbackPrompt is malformed', () => {
    expect(validateFeedbackPrompt({ feedbackPrompt: 'string' }).question).toBe('How is this space feeling?');
    expect(validateFeedbackPrompt({ feedbackPrompt: null }).question).toBe('How is this space feeling?');
    expect(validateFeedbackPrompt({ feedbackPrompt: [] }).question).toBe('How is this space feeling?');
  });

  it('returns valid feedback prompt when provided', () => {
    const result = validateFeedbackPrompt({
      feedbackPrompt: {
        question: 'How do you feel?',
        options: ['Good', 'Bad', 'Okay'],
      },
    });
    expect(result.question).toBe('How do you feel?');
    expect(result.options).toEqual(['Good', 'Bad', 'Okay']);
  });

  it('falls back when options is not exactly 3 strings', () => {
    const result = validateFeedbackPrompt({
      feedbackPrompt: {
        question: 'Custom?',
        options: ['Only', 'Two'],
      },
    });
    expect(result.question).toBe('Custom?');
    expect(result.options).toEqual(['Centering', 'A bit intense', 'Need more uplift']);
  });

  it('falls back when question is empty string', () => {
    const result = validateFeedbackPrompt({
      feedbackPrompt: {
        question: '   ',
        options: ['A', 'B', 'C'],
      },
    });
    expect(result.question).toBe('How is this space feeling?');
    expect(result.options).toEqual(['A', 'B', 'C']);
  });
});
