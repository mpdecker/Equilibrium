import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createToneMock } from '../__tests__/mocks/tone';

vi.mock('tone', () => createToneMock());

import App from '../App';

function setupFetchMock(responses: Record<string, any> = {}) {
  const mockFetch = vi.fn((url: string, options?: RequestInit) => {
    const key = `${options?.method || 'GET'}:${url}`;
    if (responses[key]) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses[key]),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pin to form mode so this suite continues to validate the original layout.
    // Instrument-mode coverage lives in src/components/instrument/__tests__/.
    try {
      localStorage.setItem('equilibrium.instrument.mode', 'form');
    } catch {
      /* private mode in test env */
    }
  });

  it('renders without crashing', () => {
    setupFetchMock();
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('shows engine paused state initially', () => {
    setupFetchMock();
    render(<App />);
    const status = screen.getAllByText('Engine paused');
    expect(status.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the play button', () => {
    setupFetchMock();
    render(<App />);
    const playButtons = screen.getAllByRole('button', { name: /play/i });
    expect(playButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('has a mood input field with correct placeholder', () => {
    setupFetchMock();
    render(<App />);
    const input = screen.getByPlaceholderText(/overwhelmed with work/i);
    expect(input).toBeTruthy();
  });

  it('renders History button', () => {
    setupFetchMock();
    render(<App />);
    expect(screen.getByText('History')).toBeTruthy();
  });

  it('toggles audio lab sheet from header', async () => {
    setupFetchMock();
    render(<App />);
    const buttons = screen.getAllByRole('button');
    const settingsBtn = buttons.find((btn) => btn.querySelector('.lucide-settings-2'));
    expect(settingsBtn).toBeTruthy();

    await userEvent.click(settingsBtn!);
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Audio Lab" })).toBeTruthy();
    });
    await userEvent.click(screen.getByRole("button", { name: /show expert controls/i }));
    await waitFor(() => {
      expect(screen.getByText("Agentic Evolution")).toBeTruthy();
    });
  });

  it('renders color palette indicator with title', () => {
    setupFetchMock();
    render(<App />);
    const palette = screen.getByTitle('Change Color Palette');
    expect(palette).toBeTruthy();
  });

  it('renders Write button', () => {
    setupFetchMock();
    render(<App />);
    expect(screen.getByText('Write')).toBeTruthy();
  });

  it('renders the EQUILIBRIUM header', () => {
    setupFetchMock();
    render(<App />);
    expect(screen.getByText('EQUILIBRIUM')).toBeTruthy();
  });
});
