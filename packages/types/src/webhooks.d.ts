import { z } from 'zod';
/**
 * Webhook subscription configuration
 */
export declare const WebhookSubscriptionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    endpoint: z.ZodString;
    secret: z.ZodString;
    events: z.ZodArray<z.ZodEnum<["PAYMENT", "CREATE_ACCOUNT", "ACCOUNT_MERGE", "SET_OPTIONS", "CHANGE_TRUST", "ALLOW_TRUST", "BUMP_SEQUENCE", "PATH_PAYMENT_STRICT_SEND", "PATH_PAYMENT_STRICT_RECEIVE", "MANAGE_BUY_OFFER", "MANAGE_SELL_OFFER", "CREATE_PASSIVE_SELL_OFFER", "CLAIM_CLAIMABLE_BALANCE", "BEGIN_SPONSORING_FUTURE_RESERVES", "END_SPONSORING_FUTURE_RESERVES", "REVOKE_SPONSORSHIP", "CLAWBACK", "CLAWBACK_CLAIMABLE_BALANCE", "SET_TRUST_LINE_FLAGS", "LIQUIDITY_POOL_DEPOSIT", "LIQUIDITY_POOL_WITHDRAW", "SOROBAN_INVOKE", "SOROBAN_DEPLOY", "SOROBAN_EVENT", "SOROBAN_EXTEND_TTL", "SOROBAN_RESTORE", "NFT_MINT", "NFT_TRANSFER", "NFT_BURN", "DEX_TRADE", "DEX_ORDER_CREATE", "DEX_ORDER_CANCEL", "TOKEN_TRANSFER", "TRUSTLINE_CHANGE", "ASSET_ISSUE", "CLAIMABLE_BALANCE_CREATED", "CLAIMABLE_BALANCE_CLAIMED"]>, "many">;
    isActive: z.ZodDefault<z.ZodBoolean>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    retryDelayMs: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    lastDeliveryAt: z.ZodOptional<z.ZodString>;
    failedDeliveries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    userId: string;
    endpoint: string;
    secret: string;
    events: ("PAYMENT" | "CREATE_ACCOUNT" | "ACCOUNT_MERGE" | "SET_OPTIONS" | "CHANGE_TRUST" | "ALLOW_TRUST" | "BUMP_SEQUENCE" | "PATH_PAYMENT_STRICT_SEND" | "PATH_PAYMENT_STRICT_RECEIVE" | "MANAGE_BUY_OFFER" | "MANAGE_SELL_OFFER" | "CREATE_PASSIVE_SELL_OFFER" | "CLAIM_CLAIMABLE_BALANCE" | "BEGIN_SPONSORING_FUTURE_RESERVES" | "END_SPONSORING_FUTURE_RESERVES" | "REVOKE_SPONSORSHIP" | "CLAWBACK" | "CLAWBACK_CLAIMABLE_BALANCE" | "SET_TRUST_LINE_FLAGS" | "LIQUIDITY_POOL_DEPOSIT" | "LIQUIDITY_POOL_WITHDRAW" | "SOROBAN_INVOKE" | "SOROBAN_DEPLOY" | "SOROBAN_EVENT" | "SOROBAN_EXTEND_TTL" | "SOROBAN_RESTORE" | "NFT_MINT" | "NFT_TRANSFER" | "NFT_BURN" | "DEX_TRADE" | "DEX_ORDER_CREATE" | "DEX_ORDER_CANCEL" | "TOKEN_TRANSFER" | "TRUSTLINE_CHANGE" | "ASSET_ISSUE" | "CLAIMABLE_BALANCE_CREATED" | "CLAIMABLE_BALANCE_CLAIMED")[];
    maxRetries: number;
    retryDelayMs: number;
    failedDeliveries: number;
    lastDeliveryAt?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    endpoint: string;
    secret: string;
    events: ("PAYMENT" | "CREATE_ACCOUNT" | "ACCOUNT_MERGE" | "SET_OPTIONS" | "CHANGE_TRUST" | "ALLOW_TRUST" | "BUMP_SEQUENCE" | "PATH_PAYMENT_STRICT_SEND" | "PATH_PAYMENT_STRICT_RECEIVE" | "MANAGE_BUY_OFFER" | "MANAGE_SELL_OFFER" | "CREATE_PASSIVE_SELL_OFFER" | "CLAIM_CLAIMABLE_BALANCE" | "BEGIN_SPONSORING_FUTURE_RESERVES" | "END_SPONSORING_FUTURE_RESERVES" | "REVOKE_SPONSORSHIP" | "CLAWBACK" | "CLAWBACK_CLAIMABLE_BALANCE" | "SET_TRUST_LINE_FLAGS" | "LIQUIDITY_POOL_DEPOSIT" | "LIQUIDITY_POOL_WITHDRAW" | "SOROBAN_INVOKE" | "SOROBAN_DEPLOY" | "SOROBAN_EVENT" | "SOROBAN_EXTEND_TTL" | "SOROBAN_RESTORE" | "NFT_MINT" | "NFT_TRANSFER" | "NFT_BURN" | "DEX_TRADE" | "DEX_ORDER_CREATE" | "DEX_ORDER_CANCEL" | "TOKEN_TRANSFER" | "TRUSTLINE_CHANGE" | "ASSET_ISSUE" | "CLAIMABLE_BALANCE_CREATED" | "CLAIMABLE_BALANCE_CLAIMED")[];
    isActive?: boolean | undefined;
    maxRetries?: number | undefined;
    retryDelayMs?: number | undefined;
    lastDeliveryAt?: string | undefined;
    failedDeliveries?: number | undefined;
}>;
export type WebhookSubscription = z.infer<typeof WebhookSubscriptionSchema>;
/**
 * Webhook delivery attempt
 */
export declare const WebhookDeliverySchema: z.ZodObject<{
    id: z.ZodString;
    subscriptionId: z.ZodString;
    eventId: z.ZodString;
    status: z.ZodEnum<["PENDING", "SUCCESS", "FAILED", "RETRYING"]>;
    statusCode: z.ZodOptional<z.ZodNumber>;
    attempt: z.ZodNumber;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    response: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "SUCCESS" | "FAILED" | "RETRYING";
    id: string;
    payload: Record<string, unknown>;
    createdAt: string;
    subscriptionId: string;
    eventId: string;
    attempt: number;
    statusCode?: number | undefined;
    response?: string | undefined;
    error?: string | undefined;
    completedAt?: string | undefined;
}, {
    status: "PENDING" | "SUCCESS" | "FAILED" | "RETRYING";
    id: string;
    payload: Record<string, unknown>;
    createdAt: string;
    subscriptionId: string;
    eventId: string;
    attempt: number;
    statusCode?: number | undefined;
    response?: string | undefined;
    error?: string | undefined;
    completedAt?: string | undefined;
}>;
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;
/**
 * Webhook event payload sent to subscribers
 */
export declare const WebhookPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    event: z.ZodString;
    type: z.ZodEnum<["PAYMENT", "CREATE_ACCOUNT", "ACCOUNT_MERGE", "SET_OPTIONS", "CHANGE_TRUST", "ALLOW_TRUST", "BUMP_SEQUENCE", "PATH_PAYMENT_STRICT_SEND", "PATH_PAYMENT_STRICT_RECEIVE", "MANAGE_BUY_OFFER", "MANAGE_SELL_OFFER", "CREATE_PASSIVE_SELL_OFFER", "CLAIM_CLAIMABLE_BALANCE", "BEGIN_SPONSORING_FUTURE_RESERVES", "END_SPONSORING_FUTURE_RESERVES", "REVOKE_SPONSORSHIP", "CLAWBACK", "CLAWBACK_CLAIMABLE_BALANCE", "SET_TRUST_LINE_FLAGS", "LIQUIDITY_POOL_DEPOSIT", "LIQUIDITY_POOL_WITHDRAW", "SOROBAN_INVOKE", "SOROBAN_DEPLOY", "SOROBAN_EVENT", "SOROBAN_EXTEND_TTL", "SOROBAN_RESTORE", "NFT_MINT", "NFT_TRANSFER", "NFT_BURN", "DEX_TRADE", "DEX_ORDER_CREATE", "DEX_ORDER_CANCEL", "TOKEN_TRANSFER", "TRUSTLINE_CHANGE", "ASSET_ISSUE", "CLAIMABLE_BALANCE_CREATED", "CLAIMABLE_BALANCE_CLAIMED"]>;
    timestamp: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "PAYMENT" | "CREATE_ACCOUNT" | "ACCOUNT_MERGE" | "SET_OPTIONS" | "CHANGE_TRUST" | "ALLOW_TRUST" | "BUMP_SEQUENCE" | "PATH_PAYMENT_STRICT_SEND" | "PATH_PAYMENT_STRICT_RECEIVE" | "MANAGE_BUY_OFFER" | "MANAGE_SELL_OFFER" | "CREATE_PASSIVE_SELL_OFFER" | "CLAIM_CLAIMABLE_BALANCE" | "BEGIN_SPONSORING_FUTURE_RESERVES" | "END_SPONSORING_FUTURE_RESERVES" | "REVOKE_SPONSORSHIP" | "CLAWBACK" | "CLAWBACK_CLAIMABLE_BALANCE" | "SET_TRUST_LINE_FLAGS" | "LIQUIDITY_POOL_DEPOSIT" | "LIQUIDITY_POOL_WITHDRAW" | "SOROBAN_INVOKE" | "SOROBAN_DEPLOY" | "SOROBAN_EVENT" | "SOROBAN_EXTEND_TTL" | "SOROBAN_RESTORE" | "NFT_MINT" | "NFT_TRANSFER" | "NFT_BURN" | "DEX_TRADE" | "DEX_ORDER_CREATE" | "DEX_ORDER_CANCEL" | "TOKEN_TRANSFER" | "TRUSTLINE_CHANGE" | "ASSET_ISSUE" | "CLAIMABLE_BALANCE_CREATED" | "CLAIMABLE_BALANCE_CLAIMED";
    id: string;
    timestamp: string;
    data: Record<string, unknown>;
    event: string;
    signature: string;
}, {
    type: "PAYMENT" | "CREATE_ACCOUNT" | "ACCOUNT_MERGE" | "SET_OPTIONS" | "CHANGE_TRUST" | "ALLOW_TRUST" | "BUMP_SEQUENCE" | "PATH_PAYMENT_STRICT_SEND" | "PATH_PAYMENT_STRICT_RECEIVE" | "MANAGE_BUY_OFFER" | "MANAGE_SELL_OFFER" | "CREATE_PASSIVE_SELL_OFFER" | "CLAIM_CLAIMABLE_BALANCE" | "BEGIN_SPONSORING_FUTURE_RESERVES" | "END_SPONSORING_FUTURE_RESERVES" | "REVOKE_SPONSORSHIP" | "CLAWBACK" | "CLAWBACK_CLAIMABLE_BALANCE" | "SET_TRUST_LINE_FLAGS" | "LIQUIDITY_POOL_DEPOSIT" | "LIQUIDITY_POOL_WITHDRAW" | "SOROBAN_INVOKE" | "SOROBAN_DEPLOY" | "SOROBAN_EVENT" | "SOROBAN_EXTEND_TTL" | "SOROBAN_RESTORE" | "NFT_MINT" | "NFT_TRANSFER" | "NFT_BURN" | "DEX_TRADE" | "DEX_ORDER_CREATE" | "DEX_ORDER_CANCEL" | "TOKEN_TRANSFER" | "TRUSTLINE_CHANGE" | "ASSET_ISSUE" | "CLAIMABLE_BALANCE_CREATED" | "CLAIMABLE_BALANCE_CLAIMED";
    id: string;
    timestamp: string;
    data: Record<string, unknown>;
    event: string;
    signature: string;
}>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
