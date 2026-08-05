/** Transaction fee estimation utilities */

import { BASE_FEE } from '@stellar/stellar-sdk';

export function estimateMinFee(operationCount: number): string {
  return (Number(BASE_FEE) * operationCount).toString();
}

export function estimateRecommendedFee(operationCount: number, multiplier = 1.5): string {
  return Math.ceil(Number(BASE_FEE) * operationCount * multiplier).toString();
}

export function stroopsToXLM(stroops: string | number): string {
  const s = typeof stroops === 'string' ? BigInt(stroops) : BigInt(stroops);
  return (Number(s) / 10_000_000).toFixed(7);
}

export function xlmToStroops(xlm: string | number): string {
  return Math.round(Number(xlm) * 10_000_000).toString();
}

export function formatFee(stroops: string): string {
  return `${stroopsToXLM(stroops)} XLM`;
}
