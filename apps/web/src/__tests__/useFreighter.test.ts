/**
 * Unit tests for useFreighter hook
 *
 * Tests cover:
 * 1. Initial state (idle, no public key)
 * 2. isFreighterInstalled detection when extension missing
 * 3. connect/disconnect state transitions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFreighter } from '@/hooks/useFreighter';

// Mock @stellar/freighter-api with named exports
const mockIsConnected = vi.fn();
const mockGetAddress = vi.fn();
const mockRequestAccess = vi.fn();

vi.mock('@stellar/freighter-api', () => ({
  isConnected: (...args: any[]) => mockIsConnected(...args),
  getAddress: (...args: any[]) => mockGetAddress(...args),
  requestAccess: (...args: any[]) => mockRequestAccess(...args),
  signTransaction: vi.fn(),
}));

import { isConnected, requestAccess, getAddress } from '@stellar/freighter-api';

describe('useFreighter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Freighter not installed
    delete (window as any).freighterApi;
  });

  it('should start with disconnected state and no public key (Freighter not installed)', () => {
    const { result } = renderHook(() => useFreighter());

    expect(result.current.state).toBe('disconnected');
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should detect Freighter is not installed', () => {
    delete (window as any).freighterApi;
    const { result } = renderHook(() => useFreighter());

    expect(result.current.isFreighterInstalled).toBe(false);
    expect(result.current.state).toBe('disconnected');
  });

  it('should detect Freighter is installed when freighterApi exists on window', () => {
    (window as any).freighterApi = { isConnected: vi.fn() };
    const { result } = renderHook(() => useFreighter());

    expect(result.current.isFreighterInstalled).toBe(true);
  });

  it('should transition to connecting then error when Freighter not installed', async () => {
    delete (window as any).freighterApi;
    const { result } = renderHook(() => useFreighter());

    await act(async () => {
      const pk = await result.current.connect();
      expect(pk).toBeNull();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('not installed');
  });

  it('should connect successfully when Freighter is installed', async () => {
    const mockPublicKey = 'GABCXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVW';
    (window as any).freighterApi = { isConnected: vi.fn(), requestAccess: vi.fn() };
    (mockIsConnected as any).mockResolvedValue(false);
    (mockRequestAccess as any).mockResolvedValue({ address: mockPublicKey });

    const { result } = renderHook(() => useFreighter());

    await act(async () => {
      const pk = await result.current.connect();
      expect(pk).toBe(mockPublicKey);
    });

    expect(result.current.state).toBe('connected');
    expect(result.current.publicKey).toBe(mockPublicKey);
    expect(result.current.isConnected).toBe(true);
  });

  it('should transition to disconnected state on disconnect', () => {
    const { result } = renderHook(() => useFreighter());

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.state).toBe('disconnected');
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });
});
