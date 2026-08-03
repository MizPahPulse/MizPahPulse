import type { StellarNetwork } from '@mizpah-pulse/types';

/**
 * Stellar network configuration
 */
export interface StellarConfig {
  network: StellarNetwork;
  horizonUrl: string;
  sorobanRpcUrl: string;
  networkPassphrase: string;
  isTestnet: boolean;
}

const NETWORK_CONFIGS: Record<StellarNetwork, Omit<StellarConfig, 'network' | 'isTestnet'>> = {
  PUBLIC: {
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://soroban-rpc.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
  },
  TESTNET: {
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
  },
  FUTURENET: {
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    sorobanRpcUrl: 'https://rpc-futurenet.stellar.org',
    networkPassphrase: 'Test SDF Future Network ; October 2022',
  },
  SANDBOX: {
    horizonUrl: process.env.STELLAR_HORIZON_URL || 'http://localhost:8000',
    sorobanRpcUrl: process.env.STELLAR_SOROBAN_RPC_URL || 'http://localhost:8000/soroban/rpc',
    networkPassphrase: 'Standalone Network ; February 2017',
  },
};

/**
 * Get Stellar network configuration
 */
export function getNetworkConfig(network?: StellarNetwork): StellarConfig {
  const selectedNetwork =
    network || (process.env.STELLAR_NETWORK as StellarNetwork) || 'TESTNET';

  const config = NETWORK_CONFIGS[selectedNetwork];
  if (!config) {
    throw new Error(`Unknown Stellar network: ${selectedNetwork}`);
  }

  return {
    network: selectedNetwork,
    isTestnet: selectedNetwork !== 'PUBLIC',
    ...config,
  };
}

/**
 * Default network config (from env or TESTNET)
 */
export const defaultNetworkConfig = getNetworkConfig();
