import { z } from 'zod';
/**
 * Stellar network event types monitored by MizpahPulse
 */
export declare const EventType: z.ZodEnum<["PAYMENT", "CREATE_ACCOUNT", "ACCOUNT_MERGE", "SET_OPTIONS", "CHANGE_TRUST", "ALLOW_TRUST", "BUMP_SEQUENCE", "PATH_PAYMENT_STRICT_SEND", "PATH_PAYMENT_STRICT_RECEIVE", "MANAGE_BUY_OFFER", "MANAGE_SELL_OFFER", "CREATE_PASSIVE_SELL_OFFER", "CLAIM_CLAIMABLE_BALANCE", "BEGIN_SPONSORING_FUTURE_RESERVES", "END_SPONSORING_FUTURE_RESERVES", "REVOKE_SPONSORSHIP", "CLAWBACK", "CLAWBACK_CLAIMABLE_BALANCE", "SET_TRUST_LINE_FLAGS", "LIQUIDITY_POOL_DEPOSIT", "LIQUIDITY_POOL_WITHDRAW", "SOROBAN_INVOKE", "SOROBAN_DEPLOY", "SOROBAN_EVENT", "SOROBAN_EXTEND_TTL", "SOROBAN_RESTORE", "NFT_MINT", "NFT_TRANSFER", "NFT_BURN", "DEX_TRADE", "DEX_ORDER_CREATE", "DEX_ORDER_CANCEL", "TOKEN_TRANSFER", "TRUSTLINE_CHANGE", "ASSET_ISSUE", "CLAIMABLE_BALANCE_CREATED", "CLAIMABLE_BALANCE_CLAIMED"]>;
export type EventType = z.infer<typeof EventType>;
/**
 * Source of the blockchain event
 */
export declare const EventSource: z.ZodEnum<["HORIZON", "SOROBAN_RPC"]>;
export type EventSource = z.infer<typeof EventSource>;
/**
 * Severity level for categorized events
 */
export declare const EventSeverity: z.ZodEnum<["INFO", "WARNING", "CRITICAL", "DEBUG"]>;
export type EventSeverity = z.infer<typeof EventSeverity>;
/**
 * Category for grouping and filtering events
 */
export declare const EventCategory: z.ZodEnum<["PAYMENT", "ACCOUNT", "DEX", "NFT", "TOKEN", "CONTRACT", "SYSTEM", "GOVERNANCE", "LIQUIDITY", "UNKNOWN"]>;
export type EventCategory = z.infer<typeof EventCategory>;
/**
 * Core event schema for all processed blockchain events
 */
export declare const BlockchainEventSchema: z.ZodObject<{
    id: z.ZodString;
    eventType: z.ZodEnum<["PAYMENT", "CREATE_ACCOUNT", "ACCOUNT_MERGE", "SET_OPTIONS", "CHANGE_TRUST", "ALLOW_TRUST", "BUMP_SEQUENCE", "PATH_PAYMENT_STRICT_SEND", "PATH_PAYMENT_STRICT_RECEIVE", "MANAGE_BUY_OFFER", "MANAGE_SELL_OFFER", "CREATE_PASSIVE_SELL_OFFER", "CLAIM_CLAIMABLE_BALANCE", "BEGIN_SPONSORING_FUTURE_RESERVES", "END_SPONSORING_FUTURE_RESERVES", "REVOKE_SPONSORSHIP", "CLAWBACK", "CLAWBACK_CLAIMABLE_BALANCE", "SET_TRUST_LINE_FLAGS", "LIQUIDITY_POOL_DEPOSIT", "LIQUIDITY_POOL_WITHDRAW", "SOROBAN_INVOKE", "SOROBAN_DEPLOY", "SOROBAN_EVENT", "SOROBAN_EXTEND_TTL", "SOROBAN_RESTORE", "NFT_MINT", "NFT_TRANSFER", "NFT_BURN", "DEX_TRADE", "DEX_ORDER_CREATE", "DEX_ORDER_CANCEL", "TOKEN_TRANSFER", "TRUSTLINE_CHANGE", "ASSET_ISSUE", "CLAIMABLE_BALANCE_CREATED", "CLAIMABLE_BALANCE_CLAIMED"]>;
    source: z.ZodEnum<["HORIZON", "SOROBAN_RPC"]>;
    category: z.ZodEnum<["PAYMENT", "ACCOUNT", "DEX", "NFT", "TOKEN", "CONTRACT", "SYSTEM", "GOVERNANCE", "LIQUIDITY", "UNKNOWN"]>;
    severity: z.ZodDefault<z.ZodEnum<["INFO", "WARNING", "CRITICAL", "DEBUG"]>>;
    transactionHash: z.ZodString;
    ledgerSequence: z.ZodNumber;
    pagingToken: z.ZodString;
    timestamp: z.ZodString;
    accountId: z.ZodOptional<z.ZodString>;
    contractId: z.ZodOptional<z.ZodString>;
    assetCode: z.ZodOptional<z.ZodString>;
    assetIssuer: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodString>;
    payload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    processedAt: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    eventType: "PAYMENT" | "CREATE_ACCOUNT" | "ACCOUNT_MERGE" | "SET_OPTIONS" | "CHANGE_TRUST" | "ALLOW_TRUST" | "BUMP_SEQUENCE" | "PATH_PAYMENT_STRICT_SEND" | "PATH_PAYMENT_STRICT_RECEIVE" | "MANAGE_BUY_OFFER" | "MANAGE_SELL_OFFER" | "CREATE_PASSIVE_SELL_OFFER" | "CLAIM_CLAIMABLE_BALANCE" | "BEGIN_SPONSORING_FUTURE_RESERVES" | "END_SPONSORING_FUTURE_RESERVES" | "REVOKE_SPONSORSHIP" | "CLAWBACK" | "CLAWBACK_CLAIMABLE_BALANCE" | "SET_TRUST_LINE_FLAGS" | "LIQUIDITY_POOL_DEPOSIT" | "LIQUIDITY_POOL_WITHDRAW" | "SOROBAN_INVOKE" | "SOROBAN_DEPLOY" | "SOROBAN_EVENT" | "SOROBAN_EXTEND_TTL" | "SOROBAN_RESTORE" | "NFT_MINT" | "NFT_TRANSFER" | "NFT_BURN" | "DEX_TRADE" | "DEX_ORDER_CREATE" | "DEX_ORDER_CANCEL" | "TOKEN_TRANSFER" | "TRUSTLINE_CHANGE" | "ASSET_ISSUE" | "CLAIMABLE_BALANCE_CREATED" | "CLAIMABLE_BALANCE_CLAIMED";
    source: "HORIZON" | "SOROBAN_RPC";
    category: "PAYMENT" | "ACCOUNT" | "DEX" | "NFT" | "TOKEN" | "CONTRACT" | "SYSTEM" | "GOVERNANCE" | "LIQUIDITY" | "UNKNOWN";
    severity: "INFO" | "WARNING" | "CRITICAL" | "DEBUG";
    transactionHash: string;
    ledgerSequence: number;
    pagingToken: string;
    timestamp: string;
    payload: Record<string, unknown>;
    processedAt: string;
    createdAt: string;
    updatedAt: string;
    accountId?: string | undefined;
    contractId?: string | undefined;
    assetCode?: string | undefined;
    assetIssuer?: string | undefined;
    amount?: string | undefined;
}, {
    id: string;
    eventType: "PAYMENT" | "CREATE_ACCOUNT" | "ACCOUNT_MERGE" | "SET_OPTIONS" | "CHANGE_TRUST" | "ALLOW_TRUST" | "BUMP_SEQUENCE" | "PATH_PAYMENT_STRICT_SEND" | "PATH_PAYMENT_STRICT_RECEIVE" | "MANAGE_BUY_OFFER" | "MANAGE_SELL_OFFER" | "CREATE_PASSIVE_SELL_OFFER" | "CLAIM_CLAIMABLE_BALANCE" | "BEGIN_SPONSORING_FUTURE_RESERVES" | "END_SPONSORING_FUTURE_RESERVES" | "REVOKE_SPONSORSHIP" | "CLAWBACK" | "CLAWBACK_CLAIMABLE_BALANCE" | "SET_TRUST_LINE_FLAGS" | "LIQUIDITY_POOL_DEPOSIT" | "LIQUIDITY_POOL_WITHDRAW" | "SOROBAN_INVOKE" | "SOROBAN_DEPLOY" | "SOROBAN_EVENT" | "SOROBAN_EXTEND_TTL" | "SOROBAN_RESTORE" | "NFT_MINT" | "NFT_TRANSFER" | "NFT_BURN" | "DEX_TRADE" | "DEX_ORDER_CREATE" | "DEX_ORDER_CANCEL" | "TOKEN_TRANSFER" | "TRUSTLINE_CHANGE" | "ASSET_ISSUE" | "CLAIMABLE_BALANCE_CREATED" | "CLAIMABLE_BALANCE_CLAIMED";
    source: "HORIZON" | "SOROBAN_RPC";
    category: "PAYMENT" | "ACCOUNT" | "DEX" | "NFT" | "TOKEN" | "CONTRACT" | "SYSTEM" | "GOVERNANCE" | "LIQUIDITY" | "UNKNOWN";
    transactionHash: string;
    ledgerSequence: number;
    pagingToken: string;
    timestamp: string;
    processedAt: string;
    createdAt: string;
    updatedAt: string;
    severity?: "INFO" | "WARNING" | "CRITICAL" | "DEBUG" | undefined;
    accountId?: string | undefined;
    contractId?: string | undefined;
    assetCode?: string | undefined;
    assetIssuer?: string | undefined;
    amount?: string | undefined;
    payload?: Record<string, unknown> | undefined;
}>;
export type BlockchainEvent = z.infer<typeof BlockchainEventSchema>;
/**
 * Raw event from Stellar before processing
 */
export declare const RawStellarEventSchema: z.ZodObject<{
    source: z.ZodEnum<["HORIZON", "SOROBAN_RPC"]>;
    type: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    capturedAt: z.ZodString;
    pagingToken: z.ZodOptional<z.ZodString>;
    transactionHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    source: "HORIZON" | "SOROBAN_RPC";
    payload: Record<string, unknown>;
    capturedAt: string;
    transactionHash?: string | undefined;
    pagingToken?: string | undefined;
}, {
    type: string;
    source: "HORIZON" | "SOROBAN_RPC";
    payload: Record<string, unknown>;
    capturedAt: string;
    transactionHash?: string | undefined;
    pagingToken?: string | undefined;
}>;
export type RawStellarEvent = z.infer<typeof RawStellarEventSchema>;
/**
 * Event filter query for searching
 */
export declare const EventFilterSchema: z.ZodObject<{
    eventTypes: z.ZodOptional<z.ZodArray<z.ZodEnum<["PAYMENT", "CREATE_ACCOUNT", "ACCOUNT_MERGE", "SET_OPTIONS", "CHANGE_TRUST", "ALLOW_TRUST", "BUMP_SEQUENCE", "PATH_PAYMENT_STRICT_SEND", "PATH_PAYMENT_STRICT_RECEIVE", "MANAGE_BUY_OFFER", "MANAGE_SELL_OFFER", "CREATE_PASSIVE_SELL_OFFER", "CLAIM_CLAIMABLE_BALANCE", "BEGIN_SPONSORING_FUTURE_RESERVES", "END_SPONSORING_FUTURE_RESERVES", "REVOKE_SPONSORSHIP", "CLAWBACK", "CLAWBACK_CLAIMABLE_BALANCE", "SET_TRUST_LINE_FLAGS", "LIQUIDITY_POOL_DEPOSIT", "LIQUIDITY_POOL_WITHDRAW", "SOROBAN_INVOKE", "SOROBAN_DEPLOY", "SOROBAN_EVENT", "SOROBAN_EXTEND_TTL", "SOROBAN_RESTORE", "NFT_MINT", "NFT_TRANSFER", "NFT_BURN", "DEX_TRADE", "DEX_ORDER_CREATE", "DEX_ORDER_CANCEL", "TOKEN_TRANSFER", "TRUSTLINE_CHANGE", "ASSET_ISSUE", "CLAIMABLE_BALANCE_CREATED", "CLAIMABLE_BALANCE_CLAIMED"]>, "many">>;
    categories: z.ZodOptional<z.ZodArray<z.ZodEnum<["PAYMENT", "ACCOUNT", "DEX", "NFT", "TOKEN", "CONTRACT", "SYSTEM", "GOVERNANCE", "LIQUIDITY", "UNKNOWN"]>, "many">>;
    accountIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    contractIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    assetCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    severity: z.ZodOptional<z.ZodArray<z.ZodEnum<["INFO", "WARNING", "CRITICAL", "DEBUG"]>, "many">>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    minLedger: z.ZodOptional<z.ZodNumber>;
    maxLedger: z.ZodOptional<z.ZodNumber>;
    searchQuery: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    sortOrder: "asc" | "desc";
    severity?: ("INFO" | "WARNING" | "CRITICAL" | "DEBUG")[] | undefined;
    eventTypes?: ("PAYMENT" | "CREATE_ACCOUNT" | "ACCOUNT_MERGE" | "SET_OPTIONS" | "CHANGE_TRUST" | "ALLOW_TRUST" | "BUMP_SEQUENCE" | "PATH_PAYMENT_STRICT_SEND" | "PATH_PAYMENT_STRICT_RECEIVE" | "MANAGE_BUY_OFFER" | "MANAGE_SELL_OFFER" | "CREATE_PASSIVE_SELL_OFFER" | "CLAIM_CLAIMABLE_BALANCE" | "BEGIN_SPONSORING_FUTURE_RESERVES" | "END_SPONSORING_FUTURE_RESERVES" | "REVOKE_SPONSORSHIP" | "CLAWBACK" | "CLAWBACK_CLAIMABLE_BALANCE" | "SET_TRUST_LINE_FLAGS" | "LIQUIDITY_POOL_DEPOSIT" | "LIQUIDITY_POOL_WITHDRAW" | "SOROBAN_INVOKE" | "SOROBAN_DEPLOY" | "SOROBAN_EVENT" | "SOROBAN_EXTEND_TTL" | "SOROBAN_RESTORE" | "NFT_MINT" | "NFT_TRANSFER" | "NFT_BURN" | "DEX_TRADE" | "DEX_ORDER_CREATE" | "DEX_ORDER_CANCEL" | "TOKEN_TRANSFER" | "TRUSTLINE_CHANGE" | "ASSET_ISSUE" | "CLAIMABLE_BALANCE_CREATED" | "CLAIMABLE_BALANCE_CLAIMED")[] | undefined;
    categories?: ("PAYMENT" | "ACCOUNT" | "DEX" | "NFT" | "TOKEN" | "CONTRACT" | "SYSTEM" | "GOVERNANCE" | "LIQUIDITY" | "UNKNOWN")[] | undefined;
    accountIds?: string[] | undefined;
    contractIds?: string[] | undefined;
    assetCodes?: string[] | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    minLedger?: number | undefined;
    maxLedger?: number | undefined;
    searchQuery?: string | undefined;
    cursor?: string | undefined;
}, {
    severity?: ("INFO" | "WARNING" | "CRITICAL" | "DEBUG")[] | undefined;
    eventTypes?: ("PAYMENT" | "CREATE_ACCOUNT" | "ACCOUNT_MERGE" | "SET_OPTIONS" | "CHANGE_TRUST" | "ALLOW_TRUST" | "BUMP_SEQUENCE" | "PATH_PAYMENT_STRICT_SEND" | "PATH_PAYMENT_STRICT_RECEIVE" | "MANAGE_BUY_OFFER" | "MANAGE_SELL_OFFER" | "CREATE_PASSIVE_SELL_OFFER" | "CLAIM_CLAIMABLE_BALANCE" | "BEGIN_SPONSORING_FUTURE_RESERVES" | "END_SPONSORING_FUTURE_RESERVES" | "REVOKE_SPONSORSHIP" | "CLAWBACK" | "CLAWBACK_CLAIMABLE_BALANCE" | "SET_TRUST_LINE_FLAGS" | "LIQUIDITY_POOL_DEPOSIT" | "LIQUIDITY_POOL_WITHDRAW" | "SOROBAN_INVOKE" | "SOROBAN_DEPLOY" | "SOROBAN_EVENT" | "SOROBAN_EXTEND_TTL" | "SOROBAN_RESTORE" | "NFT_MINT" | "NFT_TRANSFER" | "NFT_BURN" | "DEX_TRADE" | "DEX_ORDER_CREATE" | "DEX_ORDER_CANCEL" | "TOKEN_TRANSFER" | "TRUSTLINE_CHANGE" | "ASSET_ISSUE" | "CLAIMABLE_BALANCE_CREATED" | "CLAIMABLE_BALANCE_CLAIMED")[] | undefined;
    categories?: ("PAYMENT" | "ACCOUNT" | "DEX" | "NFT" | "TOKEN" | "CONTRACT" | "SYSTEM" | "GOVERNANCE" | "LIQUIDITY" | "UNKNOWN")[] | undefined;
    accountIds?: string[] | undefined;
    contractIds?: string[] | undefined;
    assetCodes?: string[] | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    minLedger?: number | undefined;
    maxLedger?: number | undefined;
    searchQuery?: string | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type EventFilter = z.infer<typeof EventFilterSchema>;
/**
 * Paginated response wrapper
 */
export declare const PaginatedResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    data: z.ZodArray<T, "many">;
    total: z.ZodNumber;
    limit: z.ZodNumber;
    cursor: z.ZodOptional<z.ZodString>;
    hasMore: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    limit: number;
    data: T["_output"][];
    total: number;
    hasMore: boolean;
    cursor?: string | undefined;
}, {
    limit: number;
    data: T["_input"][];
    total: number;
    hasMore: boolean;
    cursor?: string | undefined;
}>;
export type PaginatedResponse<T> = {
    data: T[];
    total: number;
    limit: number;
    cursor?: string;
    hasMore: boolean;
};
