import { z } from 'zod';
/**
 * Stellar network configuration
 */
export declare const StellarNetwork: z.ZodEnum<["PUBLIC", "TESTNET", "FUTURENET", "SANDBOX"]>;
export type StellarNetwork = z.infer<typeof StellarNetwork>;
/**
 * Stellar wallet account
 */
export declare const WalletAccountSchema: z.ZodObject<{
    id: z.ZodString;
    publicKey: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    network: z.ZodEnum<["PUBLIC", "TESTNET", "FUTURENET", "SANDBOX"]>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    publicKey: string;
    network: "PUBLIC" | "TESTNET" | "FUTURENET" | "SANDBOX";
    isActive: boolean;
    label?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    publicKey: string;
    network: "PUBLIC" | "TESTNET" | "FUTURENET" | "SANDBOX";
    label?: string | undefined;
    isActive?: boolean | undefined;
}>;
export type WalletAccount = z.infer<typeof WalletAccountSchema>;
/**
 * Stellar asset definition
 */
export declare const AssetSchema: z.ZodObject<{
    code: z.ZodString;
    issuer: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["NATIVE", "CREDIT_ALPHANUM4", "CREDIT_ALPHANUM12"]>;
}, "strip", z.ZodTypeAny, {
    code: string;
    type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
    issuer?: string | undefined;
}, {
    code: string;
    type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
    issuer?: string | undefined;
}>;
export type Asset = z.infer<typeof AssetSchema>;
/**
 * Payment operation details
 */
export declare const PaymentDetailsSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    asset: z.ZodObject<{
        code: z.ZodString;
        issuer: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["NATIVE", "CREDIT_ALPHANUM4", "CREDIT_ALPHANUM12"]>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }>;
    amount: z.ZodString;
    memo: z.ZodOptional<z.ZodString>;
    memoType: z.ZodOptional<z.ZodString>;
    successful: z.ZodBoolean;
    sourceAccount: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: string;
    from: string;
    to: string;
    asset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    successful: boolean;
    memo?: string | undefined;
    memoType?: string | undefined;
    sourceAccount?: string | undefined;
}, {
    amount: string;
    from: string;
    to: string;
    asset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    successful: boolean;
    memo?: string | undefined;
    memoType?: string | undefined;
    sourceAccount?: string | undefined;
}>;
export type PaymentDetails = z.infer<typeof PaymentDetailsSchema>;
/**
 * DEX trade details
 */
export declare const DexTradeDetailsSchema: z.ZodObject<{
    offerId: z.ZodString;
    seller: z.ZodString;
    buyer: z.ZodOptional<z.ZodString>;
    sellingAsset: z.ZodObject<{
        code: z.ZodString;
        issuer: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["NATIVE", "CREDIT_ALPHANUM4", "CREDIT_ALPHANUM12"]>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }>;
    buyingAsset: z.ZodObject<{
        code: z.ZodString;
        issuer: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["NATIVE", "CREDIT_ALPHANUM4", "CREDIT_ALPHANUM12"]>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }>;
    amountSold: z.ZodString;
    amountBought: z.ZodString;
    price: z.ZodString;
    type: z.ZodEnum<["BUY", "SELL"]>;
}, "strip", z.ZodTypeAny, {
    type: "BUY" | "SELL";
    offerId: string;
    seller: string;
    sellingAsset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    buyingAsset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    amountSold: string;
    amountBought: string;
    price: string;
    buyer?: string | undefined;
}, {
    type: "BUY" | "SELL";
    offerId: string;
    seller: string;
    sellingAsset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    buyingAsset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    amountSold: string;
    amountBought: string;
    price: string;
    buyer?: string | undefined;
}>;
export type DexTradeDetails = z.infer<typeof DexTradeDetailsSchema>;
/**
 * Soroban contract invocation details
 */
export declare const SorobanInvokeDetailsSchema: z.ZodObject<{
    contractId: z.ZodString;
    functionName: z.ZodString;
    args: z.ZodOptional<z.ZodArray<z.ZodUnknown, "many">>;
    result: z.ZodOptional<z.ZodUnknown>;
    success: z.ZodBoolean;
    wasmId: z.ZodOptional<z.ZodString>;
    resourceFee: z.ZodOptional<z.ZodString>;
    diagnosticEvents: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
}, "strip", z.ZodTypeAny, {
    contractId: string;
    functionName: string;
    success: boolean;
    args?: unknown[] | undefined;
    result?: unknown;
    wasmId?: string | undefined;
    resourceFee?: string | undefined;
    diagnosticEvents?: Record<string, unknown>[] | undefined;
}, {
    contractId: string;
    functionName: string;
    success: boolean;
    args?: unknown[] | undefined;
    result?: unknown;
    wasmId?: string | undefined;
    resourceFee?: string | undefined;
    diagnosticEvents?: Record<string, unknown>[] | undefined;
}>;
export type SorobanInvokeDetails = z.infer<typeof SorobanInvokeDetailsSchema>;
/**
 * NFT event details
 */
export declare const NftDetailsSchema: z.ZodObject<{
    asset: z.ZodObject<{
        code: z.ZodString;
        issuer: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["NATIVE", "CREDIT_ALPHANUM4", "CREDIT_ALPHANUM12"]>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    action: z.ZodEnum<["MINT", "TRANSFER", "BURN"]>;
    tokenId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    asset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    action: "MINT" | "TRANSFER" | "BURN";
    from?: string | undefined;
    to?: string | undefined;
    tokenId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    asset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    action: "MINT" | "TRANSFER" | "BURN";
    from?: string | undefined;
    to?: string | undefined;
    tokenId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type NftDetails = z.infer<typeof NftDetailsSchema>;
/**
 * Trustline change details
 */
export declare const TrustlineDetailsSchema: z.ZodObject<{
    accountId: z.ZodString;
    asset: z.ZodObject<{
        code: z.ZodString;
        issuer: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["NATIVE", "CREDIT_ALPHANUM4", "CREDIT_ALPHANUM12"]>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }, {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    }>;
    limit: z.ZodString;
    action: z.ZodEnum<["CREATED", "UPDATED", "REMOVED"]>;
}, "strip", z.ZodTypeAny, {
    accountId: string;
    limit: string;
    asset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    action: "CREATED" | "UPDATED" | "REMOVED";
}, {
    accountId: string;
    limit: string;
    asset: {
        code: string;
        type: "NATIVE" | "CREDIT_ALPHANUM4" | "CREDIT_ALPHANUM12";
        issuer?: string | undefined;
    };
    action: "CREATED" | "UPDATED" | "REMOVED";
}>;
export type TrustlineDetails = z.infer<typeof TrustlineDetailsSchema>;
/**
 * Transaction details on the Stellar network
 */
export declare const TransactionDetailsSchema: z.ZodObject<{
    hash: z.ZodString;
    sourceAccount: z.ZodString;
    fee: z.ZodString;
    operationCount: z.ZodNumber;
    memo: z.ZodOptional<z.ZodString>;
    memoType: z.ZodOptional<z.ZodString>;
    successful: z.ZodBoolean;
    resultCode: z.ZodOptional<z.ZodString>;
    ledgerSequence: z.ZodNumber;
    createdAt: z.ZodString;
    envelopeXdr: z.ZodOptional<z.ZodString>;
    resultXdr: z.ZodOptional<z.ZodString>;
    signatures: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    ledgerSequence: number;
    createdAt: string;
    successful: boolean;
    sourceAccount: string;
    hash: string;
    fee: string;
    operationCount: number;
    memo?: string | undefined;
    memoType?: string | undefined;
    resultCode?: string | undefined;
    envelopeXdr?: string | undefined;
    resultXdr?: string | undefined;
    signatures?: string[] | undefined;
}, {
    ledgerSequence: number;
    createdAt: string;
    successful: boolean;
    sourceAccount: string;
    hash: string;
    fee: string;
    operationCount: number;
    memo?: string | undefined;
    memoType?: string | undefined;
    resultCode?: string | undefined;
    envelopeXdr?: string | undefined;
    resultXdr?: string | undefined;
    signatures?: string[] | undefined;
}>;
export type TransactionDetails = z.infer<typeof TransactionDetailsSchema>;
