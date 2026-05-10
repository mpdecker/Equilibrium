import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createToneMock } from './mocks/tone';

vi.mock('tone', () => createToneMock());

import App from '../App';

describe('Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Pin to form mode so existing integration tests remain valid against the
    // original layout. Instrument-mode integration tests are added separately.
    try {
      localStorage.setItem('equilibrium.instrument.mode', 'form');
    } catch {
      /* private mode in test env */
    }
    mockFetch = vi.fn((url: string, options?: RequestInit) => {
      const path = url;
      const method = options?.method || 'GET';

      if (method === 'POST' && path === '/api/journals') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, content: JSON.parse(options?.body as string).content, createdAt: new Date() }),
        });
      }

      if (method === 'POST' && path === '/api/generate-music') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            params: {
              baseFrequency: 100,
              chordIntervals: [0, 7, 12],
              filterCutoffMax: 1000,
              lfoSpeed: 0.05,
              reverbWet: 0.8,
              reverbDecay: 5.0,
              volume: -10,
              droneVolume: -15,
              padVolume: -15,
              arpVolume: -10,
              bellVolume: -8,
              subVolume: -12,
              colorPalette: ['#1e1b4b', '#4c1d95', '#0ea5e9'],
              oscillatorType: 'sine',
              harmonicity: 2.0,
              modulationIndex: 2.0,
              noiseAmount: 0.1,
              noiseType: 'pink',
              delayTime: '4n',
              delayFeedback: 0.4,
              complexity: 0.3,
              attackTime: 4.0,
              releaseTime: 8.0,
              chorusDepth: 0.5,
              phaserFrequency: 0.5,
            },
            feedbackPrompt: {
              question: 'How is this space feeling?',
              options: ['Centering', 'A bit intense', 'Need more uplift'],
            },
          }),
        });
      }

      if (method === 'POST' && path === '/api/interactions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, musicParams: {}, userResponse: 'good', createdAt: new Date() }),
        });
      }

      if (method === 'POST' && path === '/api/sessions') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: JSON.parse(options?.body as string).sessionId,
              persisted: false,
            }),
        });
      }

      if (path === '/api/audio-rollout') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              effectiveEngine: 'tone',
              engine: 'tone',
              shadowMode: false,
              schemaVersion: 1,
              instrument: 'auto',
            }),
        });
      }

      if (typeof path === 'string' && path.startsWith('/api/journals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, content: 'Feeling calm today', createdAt: new Date().toISOString() },
          ]),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  it('processSentiment end-to-end: submits mood, receives params', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText(/overwhelmed with work/i);
    await userEvent.type(input, 'I feel peaceful');

    const submitBtn = document.querySelector('button[type="submit"]');
    expect(submitBtn).toBeTruthy();
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/generate-music',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('mood-to-journal flow: submits mood, fire-and-forget journal entry', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText(/overwhelmed with work/i);
    await userEvent.type(input, 'calm');

    const submitBtn = document.querySelector('button[type="submit"]');
    expect(submitBtn).toBeTruthy();
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      const journalCalls = mockFetch.mock.calls.filter(
        (call: any[]) => call[0] === '/api/journals' && call[1]?.method === 'POST'
      );
      expect(journalCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('interaction recording: journals panel shows entries', async () => {
    render(<App />);

    const historyBtn = screen.getByText('History');
    await userEvent.click(historyBtn);

    await waitFor(() => {
      expect(
        mockFetch.mock.calls.some(([p]) => typeof p === 'string' && p.startsWith('/api/journals')),
      ).toBe(true);
    });
  });
});
