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

  // NOTE: state-driven DOM (aria-activedescendant, the selected option) is
  // asserted with waitFor rather than synchronously after fireEvent: under
  // React 18's concurrent scheduler the DOM commit for a discrete keydown
  // update can land a tick after the event returns (observed flaky on the
  // Node 22 CI runtime), so the assertions poll until the commit is visible.
  it('moves the active result with ArrowDown and exposes it via aria-activedescendant', async () => {
    const input = await renderWithResults();

    expect(input.getAttribute('aria-activedescendant')).toBeNull();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(input.getAttribute('aria-activedescendant')).toBe(
        'search-result-account-GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      );
    });
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Account');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(input.getAttribute('aria-activedescendant')).toBe(
        'search-result-tx-abcdef0123456789abcdef0123456789abcdef0123456789',
      );
    });
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('TX');
  });

  it('wraps with ArrowUp and highlights the active result visually', async () => {
    const input = await renderWithResults();

    // From no selection, ArrowUp wraps to the last result (the tx).
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(input.getAttribute('aria-activedescendant')).toBe(
        'search-result-tx-abcdef0123456789abcdef0123456789abcdef0123456789',
      );
    });
    expect(screen.getByRole('option', { selected: true }).className).toContain('ring-indigo-500');
  });

  it('opens the explorer link for the active result on Enter', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const input = await renderWithResults();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Wait for the ArrowDown commit to land so Enter reads the updated selection.
    await waitFor(() => {
      expect(input.getAttribute('aria-activedescendant')).toBe(
        'search-result-account-GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      );
    });
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
    await waitFor(() => {
      expect(input.getAttribute('aria-activedescendant')).not.toBeNull();
    });

    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => {
      expect(input.getAttribute('aria-activedescendant')).toBeNull();
    });
    expect(screen.queryByRole('option', { selected: true })).not.toBeInTheDocument();
  });
});

/**
 * Load-more pagination on search results (issue #2).
 *
 * The API response carries a `pagination` object ({ hasMore, nextOffset }); the
 * page renders a "Load more" button while more pages exist and appends the next
 * page's events without a reload.
 */
function eventRow(id: string, eventType = 'PAYMENT') {
  return {
    id,
    eventType,
    category: 'PAYMENT',
    timestamp: '2026-01-01T00:00:00.000Z',
    accountId: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  };
}

function searchPayload(events: unknown[], pagination?: unknown) {
  return {
    success: true,
    data: {
      query: 'USDC',
      results: { accounts: [], transactions: [], contracts: [], events },
      ...(pagination ? { pagination } : {}),
    },
  };
}

describe('SearchPage load-more pagination', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('shows a Load more button when the API reports more pages and appends on click (#2)', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          searchPayload([eventRow('evt-1')], { offset: 0, hasMore: true, nextOffset: 10 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          searchPayload([eventRow('evt-11', 'DEX_TRADE')], {
            offset: 10,
            hasMore: false,
            nextOffset: 20,
          }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(<SearchPage />);
    const input = screen.getByPlaceholderText(
      'Search by address, tx hash, contract ID, or asset...',
    );
    fireEvent.change(input, { target: { value: 'USDC' } });

    // First page renders with the load-more affordance.
    expect(
      await screen.findByText('1 result found', undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    const loadMore = await screen.findByRole('button', { name: 'Load more results' });
    expect(loadMore).toBeInTheDocument();

    // Clicking it requests the next offset and appends the new events.
    fireEvent.click(loadMore);
    expect(
      await screen.findByText('2 results found', undefined, { timeout: 3000 }),
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('offset=10'));
    // No more pages → the button disappears.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Load more results' })).not.toBeInTheDocument(),
    );
  });

  it('hides the Load more button when the API returns no further pages (#2)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        searchPayload([eventRow('evt-1')], { offset: 0, hasMore: false, nextOffset: 10 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<SearchPage />);
    const input = screen.getByPlaceholderText(
      'Search by address, tx hash, contract ID, or asset...',
    );
    fireEvent.change(input, { target: { value: 'USDC' } });

    expect(
      await screen.findByText('1 result found', undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more results' })).not.toBeInTheDocument();
  });
});
