/**
 * Type-safe client-side environment variable accessor.
 * Provides defaults and validation for NEXT_PUBLIC_* variables.
 */

export function getClientEnv() {
  return {
    stellarNetwork: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET',
    pulseContractId:
      process.env.NEXT_PUBLIC_PULSE_CONTRACT_ID ||
      'CC4HXCVIOPUOS2UJFLTM6WP2ESNSWM4BGJ26XR4SRRVB74TOZMC7EE2C',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  } as const;
}

export type ClientEnv = ReturnType<typeof getClientEnv>;
