/**
 * Unit tests for useSendTransaction hook (issue #20: toast outcomes).
 *
 * The hook emits a success toast (with an explorer link) when a transaction
 * lands, and an error toast when it fails. renderHook is wrapped in the real
 * ToastProvider so the emitted toasts can be asserted through the container.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, screen } from '@testing-library/react';
import React from 'react';
import { ToastProvider } from '@mizpah-pulse/ui';
import { useSendTransaction } from '@/hooks/useSendTransaction';

// Mock WalletContext
vi.mock('@/context/WalletContext', () => ({
  useWallet: vi.fn(),
}));

const sdkMock = vi.hoisted(() => {
  // Single shared Horizon server instance — tests configure its methods.
  const serverInstance = {
    loadAccount: vi.fn(),
    submitTransaction: vi.fn(),
  };
  const TransactionBuilder = vi.fn(function (this: Record<string, unknown>) {
    const builder = this as Record<string, ReturnType<typeof vi.fn>>;
    builder.addOperation = vi.fn(() => builder);
    builder.addMemo = vi.fn(() => builder);
    builder.setTimeout = vi.fn(() => builder);
    builder.build = vi.fn(() => ({ toXDR: () => 'built-xdr' }));
  }) as unknown as ReturnType<typeof vi.fn> & { fromXDR: ReturnType<typeof vi.fn> };
  TransactionBuilder.fromXDR = vi.fn(() => ({}));
  return {
    Server: vi.fn(() => serverInstance),
    serverInstance,
    TransactionBuilder,
  };
});

// Mock Stellar SDK
vi.mock('@stellar/stellar-sdk', () => ({
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  TransactionBuilder: sdkMock.TransactionBuilder,
  Asset: { native: vi.fn() },
  Operation: { payment: vi.fn() },
  BASE_FEE: '100',
  Memo: { text: vi.fn() },
  Horizon: { Server: sdkMock.Server },
}));

vi.mock('@stellar/freighter-api', () => ({
  signTransaction: vi.fn(async () => ({ signedTxXdr: 'signed-xdr' })),
}));

import { useWallet } from '@/context/WalletContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

const PUBLIC_KEY = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRS';
const TX_HASH = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

function mockConnectedWallet() {
  (useWallet as ReturnType<typeof vi.fn>).mockReturnValue({
    publicKey: PUBLIC_KEY,
    isConnected: true,
  });
}

describe('useSendTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Defaults for a happy-path flow (validation only in most tests).
    sdkMock.serverInstance.loadAccount.mockReset();
    sdkMock.serverInstance.submitTransaction.mockReset();
    sdkMock.serverInstance.loadAccount.mockResolvedValue({
      balances: [{ asset_type: 'native', balance: '1000' }],
    });
  });

  it('should return error when wallet is not connected', async () => {
    (useWallet as any).mockReturnValue({
      publicKey: null,
      isConnected: false,
    });

    const { result } = renderHook(() => useSendTransaction(), { wrapper });

    await act(async () => {
      const txResult = await result.current.sendXlm(
        'GABCXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVW',
        '10',
      );
      expect(txResult).toBeNull();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toContain('not connected');
  });

  it('should validate destination address format', async () => {
    mockConnectedWallet();

    const { result } = renderHook(() => useSendTransaction(), { wrapper });

    await act(async () => {
      const txResult = await result.current.sendXlm('invalid', '10');
      expect(txResult).toBeNull();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('Invalid destination');
  });

  it('should validate amount is a positive number', async () => {
    mockConnectedWallet();

    const { result } = renderHook(() => useSendTransaction(), { wrapper });

    await act(async () => {
      const txResult = await result.current.sendXlm(PUBLIC_KEY, '-5');
      expect(txResult).toBeNull();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('Invalid amount');
  });

  it('emits an error toast with the categorized message when sending fails (#20)', async () => {
    mockConnectedWallet();
    sdkMock.serverInstance.loadAccount.mockRejectedValueOnce(new Error('horizon request failed'));

    const { result } = renderHook(() => useSendTransaction(), { wrapper });

    await act(async () => {
      await result.current.sendXlm(PUBLIC_KEY, '10');
    });

    expect(result.current.isError).toBe(true);
    expect(screen.getByText('Transaction failed')).toBeInTheDocument();
    expect(screen.getByText('horizon request failed')).toBeInTheDocument();
  });

  it('emits a success toast with the tx hash and explorer link when the transaction lands (#20)', async () => {
    mockConnectedWallet();
    sdkMock.serverInstance.submitTransaction.mockResolvedValue({
      hash: TX_HASH,
      ledger: 42,
    });

    const { result } = renderHook(() => useSendTransaction(), { wrapper });

    await act(async () => {
      const txResult = await result.current.sendXlm(PUBLIC_KEY, '10', 'hello');
      expect(txResult).not.toBeNull();
    });

    expect(result.current.state).toBe('success');
    expect(result.current.result?.hash).toBe(TX_HASH);

    // Success toast with the explorer link.
    expect(screen.getByText('Transaction sent')).toBeInTheDocument();
    expect(screen.getByText(TX_HASH.slice(0, 12) + '… confirmed on ledger 42')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'View on explorer' });
    expect(link.getAttribute('href')).toContain('stellar.expert');
  });
});
