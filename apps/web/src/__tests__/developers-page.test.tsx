/**
 * Component tests for the developers API-key management page (issue #18):
 *  - lists keys masked (raw secrets never rendered)
 *  - create flow shows the secret exactly once and adds the key to the list
 *  - revoke removes the key from the list
 *  - load failures render with a retry affordance
 *
 * The page talks to the API through apiFetch, so the global fetch is stubbed
 * with the standard `{ success, data }` envelope.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '@mizpah-pulse/ui';
import DevelopersPage from '@/app/dashboard/developers/page';

function renderPage() {
  return render(
    <ToastProvider>
      <DevelopersPage />
    </ToastProvider>,
  );
}

const fetchMock = vi.fn();

function envelope(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => (ok ? { success: true, data } : { success: false }),
  };
}

function keyRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'key-1',
    name: 'Production App',
    network: 'live',
    permissions: ['read', 'write'],
    isActive: true,
    lastUsedAt: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    maskedKey: 'mp_live_••••••••••••',
    ...overrides,
  };
}

function routesFor(fetchMock: ReturnType<typeof vi.fn>, keys: unknown[]) {
  fetchMock.mockResolvedValueOnce(envelope(keys));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DevelopersPage API keys (#18)', () => {
  it('loads and renders keys masked — never the raw secret', async () => {
    routesFor(fetchMock, [
      keyRow({ lastUsedAt: '2026-09-04T10:00:00.000Z' }),
      keyRow({
        id: 'key-2',
        name: 'Dev Testing',
        network: 'test',
        permissions: ['read'],
        maskedKey: 'mp_test_••••••••••••',
      }),
    ]);

    renderPage();

    expect(await screen.findByText('Production App')).toBeInTheDocument();
    expect(screen.getByText('Dev Testing')).toBeInTheDocument();
    expect(screen.getByText('mp_live_••••••••••••')).toBeInTheDocument();
    expect(screen.getByText('mp_test_••••••••••••')).toBeInTheDocument();
    expect(screen.getByText(/Last used never/)).toBeInTheDocument();
    // The first row was used recently (some relative time), never "never".
    expect(screen.getByText(/Last used (just now|\d+[smhd] ago)/)).toBeInTheDocument();

    const listCall = fetchMock.mock.calls.find((call) => call[0] === '/api/v1/api-keys');
    expect(listCall).toBeTruthy();
  });

  it('creates a key and reveals the secret exactly once', async () => {
    routesFor(fetchMock, []);
    fetchMock.mockResolvedValueOnce(
      envelope(
        keyRow({
          key: 'mp_live_secretvalueonlyshownonce',
          maskedKey: 'mp_live_••••••••••••',
          lastUsedAt: null,
        }),
        true,
        201,
      ),
    );

    renderPage();
    await screen.findByText('No API keys yet');

    fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
    fireEvent.change(screen.getByLabelText('Key name'), {
      target: { value: 'My New Key' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create API key/ }));

    // The raw secret is rendered once for copying.
    expect(await screen.findByText('mp_live_secretvalueonlyshownonce')).toBeInTheDocument();
    expect(screen.getByText(/copy it now/)).toBeInTheDocument();

    const createCall = fetchMock.mock.calls.find(
      (call) => call[0] === '/api/v1/api-keys' && call[1]?.method === 'POST',
    );
    expect(createCall).toBeTruthy();
    expect(JSON.parse(createCall![1].body)).toEqual({
      name: 'My New Key',
      network: 'live',
      permissions: ['read'],
    });

    // Dismissing the banner hides the secret.
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss created key' }));
    await waitFor(() => {
      expect(screen.queryByText('mp_live_secretvalueonlyshownonce')).not.toBeInTheDocument();
    });
  });

  it('toggles permissions and revokes a key, removing it from the list', async () => {
    routesFor(fetchMock, [keyRow()]);

    renderPage();
    await screen.findByText('Production App');

    // Open the form, then toggle permissions. Removing the last permission is
    // a no-op so a key always keeps at least one.
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
    fireEvent.click(screen.getByRole('button', { name: /^Write/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Write/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Read/ }));
    expect(screen.getByRole('button', { name: /^Read/ })).toHaveAttribute('aria-pressed', 'true');

    // Revoke flow.
    fetchMock.mockResolvedValueOnce(envelope({ id: 'key-1', revoked: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke Production App' }));

    await waitFor(() => {
      expect(screen.queryByText('Production App')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No API keys yet')).toBeInTheDocument();

    const revokeCall = fetchMock.mock.calls.find(
      (call) => call[0] === '/api/v1/api-keys/key-1' && call[1]?.method === 'DELETE',
    );
    expect(revokeCall).toBeTruthy();
  });

  it('shows an inline error with a retry action when listing fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: { code: 'INTERNAL_ERROR' } }),
    });

    renderPage();

    expect(
      await screen.findByText('Could not load API keys. The API may be unavailable.'),
    ).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(envelope([keyRow()]));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Production App')).toBeInTheDocument();
  });
});

describe('DevelopersPage API reference (#91)', () => {
  it('switches to the API Reference tab and lists the documented endpoints', async () => {
    fetchMock.mockResolvedValue(envelope([]));

    renderPage();
    await screen.findByText('No API keys yet');

    fireEvent.click(screen.getByRole('tab', { name: 'API Reference' }));

    expect(await screen.findAllByText('/api/v1/events')).not.toHaveLength(0);
    expect(screen.getByText('/api/v1/stats/timeseries')).toBeInTheDocument();
    expect(screen.getAllByText('/api/v1/webhooks').length).toBeGreaterThan(0);
    expect(screen.getByText('/api/v1/transactions/{hash}')).toBeInTheDocument();
    expect(screen.getByText(/all endpoints under/)).toBeInTheDocument();
  });

  it('expands an endpoint to reveal params and the sample response', async () => {
    fetchMock.mockResolvedValue(envelope([]));

    renderPage();
    await screen.findByText('No API keys yet');
    fireEvent.click(screen.getByRole('tab', { name: 'API Reference' }));

    fireEvent.click(
      await screen.findByRole('button', { name: /List blockchain events with cursor pagination/ }),
    );

    expect(await screen.findByText('Parameters')).toBeInTheDocument();
    expect(screen.getAllByText('limit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('cursor').length).toBeGreaterThan(0);
    expect(screen.getByText('Sample response')).toBeInTheDocument();
    expect(screen.getByText(/"hasMore": false/)).toBeInTheDocument();
  });

  it('runs a try-it-out request for a GET endpoint and shows the response', async () => {
    fetchMock.mockResolvedValueOnce(envelope([])); // initial keys list
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: { events: [{ id: 'evt-1' }], total: 1, cursor: null, hasMore: false },
        }),
    });

    renderPage();
    await screen.findByText('No API keys yet');
    fireEvent.click(screen.getByRole('tab', { name: 'API Reference' }));

    fireEvent.click(
      await screen.findByRole('button', { name: /List blockchain events with cursor pagination/ }),
    );
    fireEvent.change(await screen.findByLabelText('limit'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run request' }));

    expect(await screen.findByTestId('try-it-response')).toHaveTextContent('evt-1');
    expect(screen.getByText('HTTP')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();

    const runCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).startsWith('/api/v1/events'),
    );
    expect(runCall).toBeTruthy();
    expect(String(runCall![0])).toBe('/api/v1/events?limit=5');
  });

  it('shows an error when a required path parameter is missing', async () => {
    fetchMock.mockResolvedValue(envelope([]));

    renderPage();
    await screen.findByText('No API keys yet');
    fireEvent.click(screen.getByRole('tab', { name: 'API Reference' }));

    fireEvent.click(await screen.findByRole('button', { name: /GET \/api\/v1\/transactions/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Run request' }));

    expect(await screen.findByText('Path parameter "hash" is required')).toBeInTheDocument();
  });
});
