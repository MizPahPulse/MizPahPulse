/**
 * Component tests for the webhooks page create form (issue #86):
 *  - invalid URL shows an inline validation error (no network call)
 *  - submitting with no event types selected is blocked
 *  - a valid submission POSTs and adds a row to the list
 *  - the delete action removes the row
 *
 * The page talks to the API through apiFetch (a thin fetch wrapper), so the
 * global fetch is stubbed with the standard `{ success, data }` envelope.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WebhooksPage from '@/app/dashboard/webhooks/page';

const fetchMock = vi.fn();

function envelope(data: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => (ok ? { success: true, data } : { success: false }),
  };
}

function apiWebhook(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'wh-1',
    endpoint: 'https://example.com/hook',
    events: ['PAYMENT'],
    isActive: true,
    failedDeliveries: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastDeliveryAt: null,
    deliveries: [],
    ...overrides,
  };
}

/** List endpoints wrap rows in `{ data, pagination }` (see route files). */
function listEnvelope(items: unknown[]) {
  return {
    data: items,
    pagination: { page: 1, limit: 20, total: items.length, totalPages: 1 },
  };
}

async function renderLoaded() {
  fetchMock.mockResolvedValue(envelope(listEnvelope([])));
  vi.stubGlobal('fetch', fetchMock);
  render(<WebhooksPage />);
  await screen.findByText('No webhooks configured');
}

async function openCreateForm() {
  fireEvent.click(screen.getByRole('button', { name: 'New Webhook' }));
  fireEvent.change(screen.getByLabelText('Endpoint URL'), {
    target: { value: 'https://example.com/hook' },
  });
}

describe('WebhooksPage form', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('shows a validation error for an invalid endpoint URL and never POSTs (#86)', async () => {
    await renderLoaded();
    await openCreateForm();

    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: 'not-a-url' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Webhook' }));

    expect(
      await screen.findByText('Enter a valid https:// webhook endpoint URL'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/v1/webhooks',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('blocks submission when no event types are selected (#86)', async () => {
    await renderLoaded();
    await openCreateForm();

    // PAYMENT is pre-selected; toggle it off so the selection is empty.
    fireEvent.click(screen.getByRole('button', { name: 'PAYMENT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Webhook' }));

    expect(await screen.findByText('Select at least one event type')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/v1/webhooks',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('creates a webhook with a valid URL and adds a row to the list (#86)', async () => {
    fetchMock
      .mockResolvedValueOnce(envelope(listEnvelope([]))) // initial list load
      .mockResolvedValueOnce(envelope(apiWebhook()));
    vi.stubGlobal('fetch', fetchMock);
    render(<WebhooksPage />);
    await screen.findByText('No webhooks configured');

    await openCreateForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create Webhook' }));

    expect(await screen.findByText('https://example.com/hook')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/webhooks',
      expect.objectContaining({ method: 'POST' }),
    );
    // The form closes and the list is no longer empty.
    expect(screen.queryByText('No webhooks configured')).not.toBeInTheDocument();
  });

  it('deletes a webhook and removes its row from the list (#86)', async () => {
    fetchMock
      .mockResolvedValueOnce(envelope(listEnvelope([apiWebhook()]))) // initial list load
      .mockResolvedValueOnce(envelope(null)); // DELETE response
    vi.stubGlobal('fetch', fetchMock);
    render(<WebhooksPage />);
    await screen.findByText('https://example.com/hook');

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete webhook https://example.com/hook' }),
    );

    await waitFor(() =>
      expect(screen.queryByText('https://example.com/hook')).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/webhooks/wh-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
