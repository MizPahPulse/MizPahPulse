import { z } from 'zod';

/**
 * Stellar network configuration
 */
export const StellarNetwork = z.enum(['PUBLIC', 'TESTNET', 'FUTURENET', 'SANDBOX']);

export type StellarNetwork = z.infer<typeof StellarNetwork>;

/**
 * Stellar wallet account
 */
export const WalletAccountSchema = z.object({
  id: z.string(),
  publicKey: z.string(),
  label: z.string().optional(),
  network: StellarNetwork,
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WalletAccount = z.infer<typeof WalletAccountSchema>;

/**
 * Stellar asset definition
 */
export const AssetSchema = z.object({
  code: z.string(),
  issuer: z.string().optional(),
  type: z.enum(['NATIVE', 'CREDIT_ALPHANUM4', 'CREDIT_ALPHANUM12']),
});

export type Asset = z.infer<typeof AssetSchema>;

/**
 * Payment operation details
 */
export const PaymentDetailsSchema = z.object({
  from: z.string(),
  to: z.string(),
  asset: AssetSchema,
  amount: z.string(),
  memo: z.string().optional(),
  memoType: z.string().optional(),
  successful: z.boolean(),
  sourceAccount: z.string().optional(),
});

export type PaymentDetails = z.infer<typeof PaymentDetailsSchema>;

/**
 * DEX trade details
 */
export const DexTradeDetailsSchema = z.object({
  offerId: z.string(),
  seller: z.string(),
  buyer: z.string().optional(),
  sellingAsset: AssetSchema,
  buyingAsset: AssetSchema,
  amountSold: z.string(),
  amountBought: z.string(),
  price: z.string(),
  type: z.enum(['BUY', 'SELL']),
});

export type DexTradeDetails = z.infer<typeof DexTradeDetailsSchema>;

/**
 * Soroban contract invocation details
 */
export const SorobanInvokeDetailsSchema = z.object({
  contractId: z.string(),
  functionName: z.string(),
  args: z.array(z.unknown()).optional(),
  result: z.unknown().optional(),
  success: z.boolean(),
  wasmId: z.string().optional(),
  resourceFee: z.string().optional(),
  diagnosticEvents: z.array(z.record(z.unknown())).optional(),
});

export type SorobanInvokeDetails = z.infer<typeof SorobanInvokeDetailsSchema>;

/**
 * NFT event details
 */
export const NftDetailsSchema = z.object({
  asset: AssetSchema,
  from: z.string().optional(),
  to: z.string().optional(),
  action: z.enum(['MINT', 'TRANSFER', 'BURN']),
  tokenId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type NftDetails = z.infer<typeof NftDetailsSchema>;

/**
 * Trustline change details
 */
export const TrustlineDetailsSchema = z.object({
  accountId: z.string(),
  asset: AssetSchema,
  limit: z.string(),
  action: z.enum(['CREATED', 'UPDATED', 'REMOVED']),
});

export type TrustlineDetails = z.infer<typeof TrustlineDetailsSchema>;

/**
 * Transaction details on the Stellar network
 */
export const TransactionDetailsSchema = z.object({
  hash: z.string(),
  sourceAccount: z.string(),
  fee: z.string(),
  operationCount: z.number().int().nonnegative(),
  memo: z.string().optional(),
  memoType: z.string().optional(),
  successful: z.boolean(),
  resultCode: z.string().optional(),
  ledgerSequence: z.number().int().positive(),
  createdAt: z.string().datetime(),
  envelopeXdr: z.string().optional(),
  resultXdr: z.string().optional(),
  signatures: z.array(z.string()).optional(),
});

export type TransactionDetails = z.infer<typeof TransactionDetailsSchema>;
