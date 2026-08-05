export function formatContractId(id: string): string { return id.length > 20 ? `${id.slice(0, 8)}...${id.slice(-6)}` : id; }
export function isValidSorobanContractId(id: string): boolean { return /^C[A-Z0-9]{55}$/.test(id); }
export function getContractExplorerUrl(id: string, network = 'TESTNET'): string { return `https://stellar.expert/explorer/${network.toLowerCase()}/contract/${id}`; }
