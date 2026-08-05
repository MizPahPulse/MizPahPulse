import { z } from 'zod';
/**
 * Stellar network configuration
 */
export const StellarNetwork = z.enum(['PUBLIC', 'TESTNET', 'FUTURENET', 'SANDBOX']);
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
/**
 * Stellar asset definition
 */
export const AssetSchema = z.object({
    code: z.string(),
    issuer: z.string().optional(),
    type: z.enum(['NATIVE', 'CREDIT_ALPHANUM4', 'CREDIT_ALPHANUM12']),
});
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
/**
 * Trustline change details
 */
export const TrustlineDetailsSchema = z.object({
    accountId: z.string(),
    asset: AssetSchema,
    limit: z.string(),
    action: z.enum(['CREATED', 'UPDATED', 'REMOVED']),
});
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
//# sourceMappingURL=stellar.js.map