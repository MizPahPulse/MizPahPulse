import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WebhooksPage from './page';

const { apiFetchMock, ApiClientErrorMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  ApiClientErrorMock: class ApiClientError extends Error {},
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
  ApiClientError: ApiClientErrorMock,
}));

const endpoint = 'https://example.com/webhooks/stellar';

function webhook(id: string) {
  return {
    id,
    endpoint,
    events: ['PAYMENT'],
    isActive: true,
    failedDeliveries: 0,
    deliveries: [],
  };
}

describe('WebhooksPage', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue([]);
  });

  it('shows a validation error for an invalid URL', async () => {
    render(<WebhooksPage />);
    await screen.findByText('No webhooks configured');

    fireEvent.click(screen.getByRole('button', { name: 'New Webhook' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Webhook' }));

    expect(await screen.findByText('Enter a valid https:// webhook endpoint URL')).toBeDefined();
  });

  it('creates a webhook with a valid URL and selected event', async () => {
    render(<WebhooksPage />);
    await screen.findByText('No webhooks configured');

    apiFetchMock.mockResolvedValueOnce(webhook('wh-1'));
    fireEvent.click(screen.getByRole('button', { name: 'New Webhook' }));
    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: endpoint },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Webhook' }));

    expect(await screen.findByText(endpoint)).toBeDefined();
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/webhooks', {
      method: 'POST',
      body: { endpoint, events: ['PAYMENT'] },
    });
  });

  it('blocks creation when no event type is selected', async () => {
    render(<WebhooksPage />);
    await screen.findByText('No webhooks configured');

    fireEvent.click(screen.getByRole('button', { name: 'New Webhook' }));
    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: endpoint },
    });
    fireEvent.click(screen.getByRole('button', { name: 'PAYMENT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Webhook' }));

    expect(await screen.findByText('Select at least one event type')).toBeDefined();
    expect(apiFetchMock).not.toHaveBeenCalledWith('/api/v1/webhooks', {
      method: 'POST',
      body: { endpoint, events: [] },
    });
  });

  it('deletes a webhook row', async () => {
    render(<WebhooksPage />);
    await screen.findByText('No webhooks configured');

    apiFetchMock.mockResolvedValueOnce(webhook('wh-1'));
    fireEvent.click(screen.getByRole('button', { name: 'New Webhook' }));
    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: endpoint },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Webhook' }));
    await screen.findByText(endpoint);

    apiFetchMock.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: `Delete webhook ${endpoint}` }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(`/api/v1/webhooks/wh-1`, {
        method: 'DELETE',
      });
    });
    expect(screen.queryByText(endpoint)).toBeNull();
  });
});
