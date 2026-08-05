export function getExplorerTxUrl(hash: string, network = 'TESTNET'): string {
  const base = network === 'PUBLIC' ? 'https://stellar.expert/explorer/public/tx/' : 'https://stellar.expert/explorer/testnet/tx/';
  return base + hash;
}

export function getExplorerAccountUrl(pubKey: string, network = 'TESTNET'): string {
  const base = network === 'PUBLIC' ? 'https://stellar.expert/explorer/public/account/' : 'https://stellar.expert/explorer/testnet/account/';
  return base + pubKey;
}

export function getExplorerContractUrl(contractId: string, network = 'TESTNET'): string {
  const base = network === 'PUBLIC' ? 'https://stellar.expert/explorer/public/contract/' : 'https://stellar.expert/explorer/testnet/contract/';
  return base + contractId;
}
