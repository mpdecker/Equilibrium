import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AudioVisualizer } from '../AudioVisualizer';

function createMockAnalyser(getValue = () => new Float32Array(256)) {
  return {
    getValue,
    type: 'waveform' as const,
    size: 256,
    dispose: vi.fn(),
  };
}

describe('AudioVisualizer', () => {
  it('renders a canvas element', () => {
    const analyser = createMockAnalyser();
    const { container } = render(
      <AudioVisualizer
        analyser={analyser as any}
        isPlaying={true}
        colorPalette={['#111111', '#222222', '#333333']}
        particleDensity={100}
      />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('has pointer-events-none class on the canvas', () => {
    const analyser = createMockAnalyser();
    const { container } = render(
      <AudioVisualizer
        analyser={analyser as any}
        isPlaying={true}
        colorPalette={['#111111', '#222222', '#333333']}
        particleDensity={100}
      />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas?.className).toContain('pointer-events-none');
  });

  it('does not crash when analyser is null', () => {
    const { container } = render(
      <AudioVisualizer
        analyser={null}
        isPlaying={false}
        colorPalette={['#111111', '#222222', '#333333']}
        particleDensity={100}
      />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('does not crash with empty colorPalette', () => {
    const analyser = createMockAnalyser();
    const { container } = render(
      <AudioVisualizer
        analyser={analyser as any}
        isPlaying={true}
        colorPalette={[]}
        particleDensity={100}
      />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('does not crash with null colorPalette', () => {
    const analyser = createMockAnalyser();
    const { container } = render(
      <AudioVisualizer
        analyser={analyser as any}
        isPlaying={true}
        colorPalette={null as any}
        particleDensity={100}
      />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('accepts a valid analyser and renders', () => {
    const analyser = createMockAnalyser();
    const { container } = render(
      <AudioVisualizer
        analyser={analyser as any}
        isPlaying={false}
        colorPalette={['#ff0000', '#00ff00', '#0000ff']}
        particleDensity={50}
      />
    );
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
