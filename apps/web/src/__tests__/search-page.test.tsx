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
