/**
 * Integration tests for contract invocation hook (issue #20: toast outcomes).
 *
 * Tests cover:
 * 1. Validation: wallet not connected (+ error toast emission)
 * 2. Validation: invalid contract ID
 * 3. Initial idle state
 *
 * renderHook is wrapped in the real ToastProvider because useContractInvoke
 * now emits outcome toasts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, screen } from '@testing-library/react';
import React from 'react';
import { ToastProvider } from '@mizpah-pulse/ui';
import { useContractInvoke } from '@/hooks/useContractInvoke';

vi.mock('@/context/WalletContext', () => ({
  useWallet: vi.fn(),
}));

vi.mock('@stellar/stellar-sdk', () => ({
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  TransactionBuilder: vi.fn(),
  BASE_FEE: '100',
  Server: vi.fn(),
  rpc: {
    Server: vi.fn(),
    assembleTransaction: vi.fn(),
    Api: { isSimulationError: vi.fn() },
  },
  xdr: { ScVal: { scvSymbol: vi.fn() } },
  Address: vi.fn(),
  Contract: vi.fn(),
  scValToNative: vi.fn(),
}));

vi.mock('@stellar/freighter-api', () => ({
  signTransaction: vi.fn(),
}));

import { useWallet } from '@/context/WalletContext';

const TEST_CONTRACT_ID = 'CA7GXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXY';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('useContractInvoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when wallet is not connected', async () => {
    (useWallet as any).mockReturnValue({
      publicKey: null,
      isConnected: false,
    });

    const { result } = renderHook(() => useContractInvoke(TEST_CONTRACT_ID), { wrapper });

    await act(async () => {
      const invokeResult = await result.current.invoke('pulse', ['alice']);
      expect(invokeResult).toBeNull();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toContain('WALLET_NOT_CONNECTED');
  });

  it('should validate contract ID format', async () => {
    (useWallet as any).mockReturnValue({
      publicKey: 'GABCXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVW',
      isConnected: true,
    });

    const { result } = renderHook(() => useContractInvoke('invalid-contract-id'), { wrapper });

    await act(async () => {
      const invokeResult = await result.current.invoke('pulse', ['alice']);
      expect(invokeResult).toBeNull();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('INVALID_CONTRACT');
  });

  it('should initialize with idle state', () => {
    (useWallet as any).mockReturnValue({
      publicKey: 'GABCXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVW',
      isConnected: true,
    });

    const { result } = renderHook(() => useContractInvoke(TEST_CONTRACT_ID), { wrapper });

    expect(result.current.state).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isInvoking).toBe(false);
  });

  it('emits an error toast when the invocation fails (#20)', async () => {
    (useWallet as any).mockReturnValue({
      publicKey: null,
      isConnected: false,
    });

    const { result } = renderHook(() => useContractInvoke(TEST_CONTRACT_ID), { wrapper });

    await act(async () => {
      await result.current.invoke('pulse', ['alice']);
    });

    expect(screen.getByText('Contract invocation failed')).toBeInTheDocument();
    expect(screen.getByText(/WALLET_NOT_CONNECTED/)).toBeInTheDocument();
  });
});
