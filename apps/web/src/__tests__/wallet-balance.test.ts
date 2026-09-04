import { describe, it, expect } from 'vitest';
import { getNativeXlmBalance, formatXlmBalance, type BalanceLoader } from '@/lib/wallet-balance';

function loaderWith(balances: Array<{ asset_type: string; balance: string }>): BalanceLoader {
  return {
    loadAccount: async () => ({ balances }),
  };
}

describe('getNativeXlmBalance', () => {
  it('returns the native balance for an account holding XLM', async () => {
    const loader = loaderWith([
      { asset_type: 'credit_alphanum4', balance: '10.5' },
      { asset_type: 'native', balance: '123.4567891' },
    ]);

    await expect(getNativeXlmBalance('GABC', loader)).resolves.toBe('123.4567891');
  });

  it('returns "0" when the account holds no native balance', async () => {
    const loader = loaderWith([{ asset_type: 'credit_alphanum4', balance: '10.5' }]);
    await expect(getNativeXlmBalance('GABC', loader)).resolves.toBe('0');
  });

  it('propagates Horizon failures so callers can render an error state', async () => {
    const failing: BalanceLoader = {
      loadAccount: async () => {
        throw new Error('Horizon unreachable');
      },
    };
    await expect(getNativeXlmBalance('GABC', failing)).rejects.toThrow('Horizon unreachable');
  });
});

describe('formatXlmBalance', () => {
  it('formats with up to seven decimal places', () => {
    expect(formatXlmBalance('1234.5')).toBe('1,234.5');
    expect(formatXlmBalance('0.0000001')).toBe('0.0000001');
  });

  it('drops trailing zeros without exponent notation', () => {
    expect(formatXlmBalance('100.0000000')).toBe('100');
  });

  it('falls back to zero for unparseable input', () => {
    expect(formatXlmBalance('not-a-number')).toBe('0');
    expect(formatXlmBalance('')).toBe('0');
  });
});
