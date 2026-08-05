import {
  type EventCategory,
  type EventType,
  type RawStellarEvent,
  type BlockchainEvent,
} from '@mizpah-pulse/types';

/**
 * Categorize a Stellar operation type into an event category
 */
export function categorizeEventType(type: string): EventCategory {
  const paymentTypes = [
    'payment',
    'path_payment_strict_send',
    'path_payment_strict_receive',
    'create_account',
    'claim_claimable_balance',
  ];
  const dexTypes = [
    'manage_buy_offer',
    'manage_sell_offer',
    'create_passive_sell_offer',
    'liquidity_pool_deposit',
    'liquidity_pool_withdraw',
  ];
  const tokenTypes = [
    'change_trust',
    'allow_trust',
    'set_trust_line_flags',
    'clawback',
    'clawback_claimable_balance',
  ];
  const contractTypes = [
    'invoke_host_function',
    'extend_footprint_ttl',
    'restore_footprint',
    'contract_event',
    'soroban_event',
  ];
  const accountTypes = [
    'set_options',
    'account_merge',
    'bump_sequence',
    'begin_sponsoring_future_reserves',
    'end_sponsoring_future_reserves',
    'revoke_sponsorship',
  ];
  const nftTypes = ['nft_mint', 'nft_transfer', 'nft_burn'];

  const lower = type.toLowerCase();

  if (paymentTypes.includes(lower)) return 'PAYMENT';
  if (dexTypes.includes(lower)) return 'DEX';
  if (tokenTypes.includes(lower)) return 'TOKEN';
  if (contractTypes.includes(lower)) return 'CONTRACT';
  if (accountTypes.includes(lower)) return 'ACCOUNT';
  if (nftTypes.includes(lower) || lower.includes('nft')) return 'NFT';
  if (lower.includes('governance')) return 'GOVERNANCE';
  if (lower.includes('liquidity')) return 'LIQUIDITY';
  if (lower.includes('sys')) return 'SYSTEM';

  return 'UNKNOWN';
}

/**
 * Map a Stellar operation type to our internal event type enum
 */
export function mapToEventType(operationType: string): EventType {
  const mapping: Record<string, EventType> = {
    create_account: 'CREATE_ACCOUNT',
    payment: 'PAYMENT',
    path_payment_strict_send: 'PATH_PAYMENT_STRICT_SEND',
    path_payment_strict_receive: 'PATH_PAYMENT_STRICT_RECEIVE',
    manage_buy_offer: 'MANAGE_BUY_OFFER',
    manage_sell_offer: 'MANAGE_SELL_OFFER',
    create_passive_sell_offer: 'CREATE_PASSIVE_SELL_OFFER',
    set_options: 'SET_OPTIONS',
    change_trust: 'CHANGE_TRUST',
    allow_trust: 'ALLOW_TRUST',
    account_merge: 'ACCOUNT_MERGE',
    bump_sequence: 'BUMP_SEQUENCE',
    claim_claimable_balance: 'CLAIM_CLAIMABLE_BALANCE',
    begin_sponsoring_future_reserves: 'BEGIN_SPONSORING_FUTURE_RESERVES',
    end_sponsoring_future_reserves: 'END_SPONSORING_FUTURE_RESERVES',
    revoke_sponsorship: 'REVOKE_SPONSORSHIP',
    clawback: 'CLAWBACK',
    clawback_claimable_balance: 'CLAWBACK_CLAIMABLE_BALANCE',
    set_trust_line_flags: 'SET_TRUST_LINE_FLAGS',
    liquidity_pool_deposit: 'LIQUIDITY_POOL_DEPOSIT',
    liquidity_pool_withdraw: 'LIQUIDITY_POOL_WITHDRAW',
    invoke_host_function: 'SOROBAN_INVOKE',
    extend_footprint_ttl: 'SOROBAN_EXTEND_TTL',
    restore_footprint: 'SOROBAN_RESTORE',
  };

  const mapped = mapping[operationType.toLowerCase()];
  if (!mapped) {
    // Return as-is for known Stellar types not in our map; let validation handle unknowns
    return operationType.toUpperCase() as EventType;
  }
  return mapped;
}

/**
 * Parse a raw Stellar event into a processed blockchain event
 */
export function parseRawEvent(raw: RawStellarEvent): Partial<BlockchainEvent> {
  const now = new Date().toISOString();
  const eventType = mapToEventType(raw.type);
  const category = categorizeEventType(raw.type);

  const base: Partial<BlockchainEvent> = {
    eventType,
    source: raw.source,
    category,
    timestamp: raw.capturedAt,
    transactionHash: raw.transactionHash,
    pagingToken: raw.pagingToken ?? '0',
    payload: raw.payload,
    processedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  return base;
}

/**
 * Normalize an event payload for storage
 */
export function normalizeEventPayload(event: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(event)) {
    // Convert BigInt values to strings
    if (typeof value === 'bigint') {
      normalized[key] = value.toString();
    }
    // Recursively normalize nested objects
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      normalized[key] = normalizeEventPayload(value as Record<string, unknown>);
    }
    // Normalize arrays
    else if (Array.isArray(value)) {
      normalized[key] = value.map((item) =>
        typeof item === 'bigint'
          ? item.toString()
          : item && typeof item === 'object'
            ? normalizeEventPayload(item as Record<string, unknown>)
            : item,
      );
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}
