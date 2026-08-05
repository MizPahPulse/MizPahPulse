import { z } from 'zod';
/**
 * Stellar network event types monitored by MizpahPulse
 */
export const EventType = z.enum([
    'PAYMENT',
    'CREATE_ACCOUNT',
    'ACCOUNT_MERGE',
    'SET_OPTIONS',
    'CHANGE_TRUST',
    'ALLOW_TRUST',
    'BUMP_SEQUENCE',
    'PATH_PAYMENT_STRICT_SEND',
    'PATH_PAYMENT_STRICT_RECEIVE',
    'MANAGE_BUY_OFFER',
    'MANAGE_SELL_OFFER',
    'CREATE_PASSIVE_SELL_OFFER',
    'CLAIM_CLAIMABLE_BALANCE',
    'BEGIN_SPONSORING_FUTURE_RESERVES',
    'END_SPONSORING_FUTURE_RESERVES',
    'REVOKE_SPONSORSHIP',
    'CLAWBACK',
    'CLAWBACK_CLAIMABLE_BALANCE',
    'SET_TRUST_LINE_FLAGS',
    'LIQUIDITY_POOL_DEPOSIT',
    'LIQUIDITY_POOL_WITHDRAW',
    'SOROBAN_INVOKE',
    'SOROBAN_DEPLOY',
    'SOROBAN_EVENT',
    'SOROBAN_EXTEND_TTL',
    'SOROBAN_RESTORE',
    'NFT_MINT',
    'NFT_TRANSFER',
    'NFT_BURN',
    'DEX_TRADE',
    'DEX_ORDER_CREATE',
    'DEX_ORDER_CANCEL',
    'TOKEN_TRANSFER',
    'TRUSTLINE_CHANGE',
    'ASSET_ISSUE',
    'CLAIMABLE_BALANCE_CREATED',
    'CLAIMABLE_BALANCE_CLAIMED',
]);
/**
 * Source of the blockchain event
 */
export const EventSource = z.enum(['HORIZON', 'SOROBAN_RPC']);
/**
 * Severity level for categorized events
 */
export const EventSeverity = z.enum(['INFO', 'WARNING', 'CRITICAL', 'DEBUG']);
/**
 * Category for grouping and filtering events
 */
export const EventCategory = z.enum([
    'PAYMENT',
    'ACCOUNT',
    'DEX',
    'NFT',
    'TOKEN',
    'CONTRACT',
    'SYSTEM',
    'GOVERNANCE',
    'LIQUIDITY',
    'UNKNOWN',
]);
/**
 * Core event schema for all processed blockchain events
 */
export const BlockchainEventSchema = z.object({
    id: z.string(),
    eventType: EventType,
    source: EventSource,
    category: EventCategory,
    severity: EventSeverity.default('INFO'),
    transactionHash: z.string(),
    ledgerSequence: z.number().int().positive(),
    pagingToken: z.string(),
    timestamp: z.string().datetime(),
    accountId: z.string().optional(),
    contractId: z.string().optional(),
    assetCode: z.string().optional(),
    assetIssuer: z.string().optional(),
    amount: z.string().optional(),
    payload: z.record(z.unknown()).default({}),
    processedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
/**
 * Raw event from Stellar before processing
 */
export const RawStellarEventSchema = z.object({
    source: EventSource,
    type: z.string(),
    payload: z.record(z.unknown()),
    capturedAt: z.string().datetime(),
    pagingToken: z.string().optional(),
    transactionHash: z.string().optional(),
});
/**
 * Event filter query for searching
 */
export const EventFilterSchema = z.object({
    eventTypes: z.array(EventType).optional(),
    categories: z.array(EventCategory).optional(),
    accountIds: z.array(z.string()).optional(),
    contractIds: z.array(z.string()).optional(),
    assetCodes: z.array(z.string()).optional(),
    severity: z.array(EventSeverity).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    minLedger: z.number().int().positive().optional(),
    maxLedger: z.number().int().positive().optional(),
    searchQuery: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(50),
    cursor: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
/**
 * Paginated response wrapper
 */
export const PaginatedResponseSchema = (itemSchema) => z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    cursor: z.string().optional(),
    hasMore: z.boolean(),
});
//# sourceMappingURL=events.js.map