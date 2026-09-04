/**
 * Component tests for the search page skeleton loading state (issue #1).
 *
 * Renders the real SearchPage with a stubbed fetch so the request lifecycle
 * (debounce → in-flight → resolved) can be driven deterministically.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SearchPage from '@/app/dashboard/search/page';

const fetchMock = vi.fn();

describe('SearchPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('shows skeleton cards while the first search is in flight, then swaps in results', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<SearchPage />);

    const input = screen.getByPlaceholderText(
      'Search by address, tx hash, contract ID, or asset...',
    );
    fireEvent.change(input, { target: { value: 'GABC1234567890' } });

    // Skeletons appear once the 400ms debounce fires and the request is pending.
    await waitFor(() => expect(screen.getByTestId('search-results-skeleton')).toBeInTheDocument(), {
      timeout: 3000,
    });

    // Resolve the request with a single account result.
    const response = {
      ok: true,
      json: async () => ({
        success: true,
        data: {
          results: {
            accounts: [
              {
                publicKey: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                eventCount: 3,
                recentEvents: [],
              },
            ],
            transactions: [],
            contracts: [],
            events: [],
          },
        },
      }),
    };
    await act(async () => {
      resolveFetch?.(response);
    });

    await waitFor(() =>
      expect(screen.queryByTestId('search-results-skeleton')).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('1 result found')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/v1/search?q='));
  });

  it('shows an empty state for a resolved search without matches', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          results: { accounts: [], transactions: [], contracts: [], events: [] },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<SearchPage />);

    const input = screen.getByPlaceholderText(
      'Search by address, tx hash, contract ID, or asset...',
    );
    fireEvent.change(input, { target: { value: 'ZZZZ' } });

    expect(
      await screen.findByText(/No results found/i, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('search-results-skeleton')).not.toBeInTheDocument();
  });
});

/**
 * Keyboard navigation on search results (issue #8).
 *
 * Reuses the stubbed-fetch pattern: resolve a multi-type result set, then drive
 * arrow keys / Enter / Escape on the search input and assert on the
 * aria-activedescendant wiring and the active option's highlight.
 */
const resultsFixture = {
  success: true,
  data: {
    results: {
      accounts: [
        {
          publicKey: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
          eventCount: 3,
          recentEvents: [],
        },
      ],
      transactions: [
        {
          hash: 'abcdef0123456789abcdef0123456789abcdef0123456789',
          found: true,
          eventType: 'payment',
        },
      ],
      contracts: [],
      events: [],
    },
  },
};

async function renderWithResults() {
  fetchMock.mockResolvedValue({ ok: true, json: async () => resultsFixture });
  vi.stubGlobal('fetch', fetchMock);

  render(<SearchPage />);

  const input = screen.getByPlaceholderText('Search by address, tx hash, contract ID, or asset...');
  fireEvent.change(input, { target: { value: 'GABC1234567890' } });
  await screen.findByText('2 results found', undefined, { timeout: 3000 });
  return input;
}

describe('SearchPage keyboard navigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('moves the active result with ArrowDown and exposes it via aria-activedescendant', async () => {
    const input = await renderWithResults();

    expect(input.getAttribute('aria-activedescendant')).toBeNull();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(
      'search-result-account-GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    );
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Account');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(
      'search-result-tx-abcdef0123456789abcdef0123456789abcdef0123456789',
    );
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('TX');
  });

  it('wraps with ArrowUp and highlights the active result visually', async () => {
    const input = await renderWithResults();

    // From no selection, ArrowUp wraps to the last result (the tx).
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.getAttribute('aria-activedescendant')).toBe(
      'search-result-tx-abcdef0123456789abcdef0123456789abcdef0123456789',
    );
    expect(screen.getByRole('option', { selected: true }).className).toContain('ring-indigo-500');
  });

  it('opens the explorer link for the active result on Enter', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const input = await renderWithResults();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(openSpy).toHaveBeenCalledWith(
      'https://stellar.expert/explorer/testnet/account/GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('clears the selection with Escape', async () => {
    const input = await renderWithResults();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).not.toBeNull();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.getAttribute('aria-activedescendant')).toBeNull();
    expect(screen.queryByRole('option', { selected: true })).not.toBeInTheDocument();
  });
});
