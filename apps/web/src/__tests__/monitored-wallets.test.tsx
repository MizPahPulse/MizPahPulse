/**
 * Component tests for the monitored-wallets section of the wallets page
 * (issues #5, #25, #49): empty state with a tracking CTA, per-row live XLM
 * balances with a 30s auto-refresh, and graceful failure when Horizon is
 * unreachable.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastProvider } from '@mizpah-pulse/ui';
import { MonitoredWallets } from '@/components/monitored-wallets';
import type { BalanceLoader } from '@/lib/wallet-balance';

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
  ApiClientError: class ApiClientError extends Error {
    code = 'ERROR';
    status = 500;
  },
}));

const walletContextMock = vi.hoisted(() => ({
  useWallet: vi.fn(() => ({
    publicKey: null as string | null,
    isConnected: false,
  })),
}));
vi.mock('@/context/WalletContext', () => walletContextMock);

const VALID_KEY_1 = 'GAJB5URQSW6DA5LZLMEIXOZWGSZTUO25OGJQOKSKPYWMOHUKRKLKAOSZ';
const VALID_KEY_2 = 'GDOC4DGUZKVXW3YA4OHYHFQ3QXPRFGBI2GN2B4SRLTSTUZ2COWCD23GO';

function walletRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wal-1',
    publicKey: VALID_KEY_1,
    label: 'Treasury',
    network: 'TESTNET',
    isActive: true,
    notificationEnabled: true,
    lastSyncedAt: '2026-09-04T11:30:00.000Z',
    createdAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

function loaderWith(balances: Record<string, string | Error>): BalanceLoader {
  return {
    loadAccount: async (publicKey: string) => {
      const value = balances[publicKey];
      if (value instanceof Error) throw value;
      return {
        balances: [{ asset_type: 'native', balance: value ?? '0' }],
      };
    },
  };
}

function renderSection(ui: React.ReactElement) {
  // TruncatedKey embeds a CopyButton that requires the toast context.
  return render(ui, { wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider> });
}

beforeEach(() => {
  vi.clearAllMocks();
  apiFetchMock.mockResolvedValue({ data: [] });
  walletContextMock.useWallet.mockReturnValue({ publicKey: null, isConnected: false });
});

describe('MonitoredWallets', () => {
  it('renders the empty state with a tracking CTA when connected and nothing is tracked', async () => {
    walletContextMock.useWallet.mockReturnValue({
      publicKey: VALID_KEY_1,
      isConnected: true,
    });
    apiFetchMock.mockResolvedValue({ data: [] });

    renderSection(<MonitoredWallets loader={loaderWith({})} />);

    expect(await screen.findByText('No monitored wallets yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Track this wallet' })).toBeInTheDocument();
  });

  it('renders nothing extra when disconnected and nothing is tracked (page-level empty state covers it)', async () => {
    walletContextMock.useWallet.mockReturnValue({ publicKey: null, isConnected: false });
    apiFetchMock.mockResolvedValue({ data: [] });

    const { container } = renderSection(<MonitoredWallets loader={loaderWith({})} />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    // The list is empty and the user is disconnected → no duplicated empty state.
    expect(screen.queryByText('No monitored wallets yet')).not.toBeInTheDocument();
    expect(container.querySelectorAll('section')).toHaveLength(1);
  });

  it('lists monitored wallets with a live balance per row', async () => {
    walletContextMock.useWallet.mockReturnValue({
      publicKey: VALID_KEY_1,
      isConnected: true,
    });
    apiFetchMock.mockResolvedValue({ data: [walletRow()] });

    renderSection(
      <MonitoredWallets
        loader={loaderWith({ [VALID_KEY_1]: '125.5' })}
        balanceRefreshMs={30_000}
      />,
    );

    expect(await screen.findByText('Treasury')).toBeInTheDocument();
    // Balance text is split across a <p> and a nested <span>, so match the
    // paragraph's normalized text content with a regex.
    expect(await screen.findByText(/125\.5/)).toBeInTheDocument();
    // lastSyncedAt surfaced from the wallets API is rendered.
    expect(screen.getByText(/Last activity synced/)).toBeInTheDocument();
  });

  it('renders a retryable failure state when Horizon is unreachable', async () => {
    walletContextMock.useWallet.mockReturnValue({
      publicKey: VALID_KEY_2,
      isConnected: true,
    });
    apiFetchMock.mockResolvedValue({ data: [walletRow({ id: 'wal-2', publicKey: VALID_KEY_2 })] });

    renderSection(
      <MonitoredWallets loader={loaderWith({ [VALID_KEY_2]: new Error('Horizon unreachable') })} />,
    );

    expect(await screen.findByText('Balance unavailable — retry')).toBeInTheDocument();
  });

  it('registers the connected wallet when the CTA is clicked and refreshes the list', async () => {
    walletContextMock.useWallet.mockReturnValue({
      publicKey: VALID_KEY_1,
      isConnected: true,
    });
    apiFetchMock
      .mockResolvedValueOnce({ data: [] }) // initial list
      .mockResolvedValue({ data: [walletRow()] }); // POST + refreshed list

    renderSection(<MonitoredWallets loader={loaderWith({ [VALID_KEY_1]: '10' })} />);

    const cta = await screen.findByRole('button', { name: 'Track this wallet' });
    await act(async () => {
      fireEvent.click(cta);
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/v1/wallets',
      expect.objectContaining({
        method: 'POST',
        body: { publicKey: VALID_KEY_1 },
      }),
    );
    expect(await screen.findByText('Treasury')).toBeInTheDocument();
    expect(screen.getByText('Wallet added to monitoring.')).toBeInTheDocument();
  });
});
