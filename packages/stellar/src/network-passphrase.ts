/** Stellar network passphrases for transaction signing */

export const NETWORK_PASSPHRASES = {
  PUBLIC: 'Public Global Stellar Network ; September 2015',
  TESTNET: 'Test SDF Network ; September 2015',
  FUTURENET: 'Test SDF Future Network ; October 2022',
  SANDBOX: 'Standalone Network ; February 2017',
} as const;

export type NetworkType = keyof typeof NETWORK_PASSPHRASES;

export function getPassphrase(network: NetworkType): string {
  return NETWORK_PASSPHRASES[network];
}

export function isTestnet(network: NetworkType): boolean {
  return network !== 'PUBLIC';
}
