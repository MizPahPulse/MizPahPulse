/** Application-wide constants */

export const APP_NAME = 'MizPahPulse';
export const APP_DESCRIPTION = 'Real-time blockchain intelligence for the Stellar ecosystem';
export const APP_VERSION = '0.2.0';

export const STELLAR_EXPERT_BASE = 'https://stellar.expert/explorer';
export const FREIGHTER_INSTALL_URL = 'https://freighter.app';

export const POLL_INTERVALS = {
  BALANCE: 30_000,
  EVENTS: 5_000,
  WEBHOOK_DELIVERY: 10_000,
} as const;

export const API_VERSION = 'v1';
export const MAX_EVENT_BUFFER = 100;
export const DEFAULT_SEARCH_DEBOUNCE = 400;
