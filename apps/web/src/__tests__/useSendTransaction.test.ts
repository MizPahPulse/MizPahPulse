/**
 * Unit tests for useSendTransaction hook
 *
 * Tests cover:
 * 1. Validation: empty destination
 * 2. Validation: invalid amount
 * 3. Error: wallet not connected
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSendTransaction } from '@/hooks/useSendTransaction';

// Mock WalletContext
vi.mock('@/context/WalletContext', () => ({
  useWallet: vi.fn(),
}));

// Mock Stellar SDK
vi.mock('@stellar/stellar-sdk', () => ({
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  TransactionBuilder: vi.fn(),
  Asset: { native: vi.fn() },
  Operation: { payment: vi.fn() },
  BASE_FEE: '100',
  Memo: { text: 'text' },
  Server: vi.fn(),
}));

vi.mock('@stellar/freighter-api', () => ({
  default: { signTransaction: vi.fn() },
}));

import { useWallet } from '@/context/WalletContext';

describe('useSendTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when wallet is not connected', async () => {
    (useWallet as any).mockReturnValue({
      publicKey: null,
      isConnected: false,
    });

    const { result } = renderHook(() => useSendTransaction());

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
    (useWallet as any).mockReturnValue({
      publicKey: 'GABCXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVW',
      isConnected: true,
    });

    const { result } = renderHook(() => useSendTransaction());

    await act(async () => {
      const txResult = await result.current.sendXlm('invalid', '10');
      expect(txResult).toBeNull();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('Invalid destination');
  });

  it('should validate amount is a positive number', async () => {
    (useWallet as any).mockReturnValue({
      publicKey: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRS',
      isConnected: true,
    });

    const { result } = renderHook(() => useSendTransaction());

    await act(async () => {
      const txResult = await result.current.sendXlm(
        'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRS',
        '-5',
      );
      expect(txResult).toBeNull();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('Invalid amount');
  });
});
