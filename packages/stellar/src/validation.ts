import { StrKey } from '@stellar/stellar-sdk';

export function isValidStellarAddress(address: string): boolean {
  try { return StrKey.isValidEd25519PublicKey(address); } catch { return false; }
}

export function isValidSecretKey(secret: string): boolean {
  try { return StrKey.isValidEd25519SecretSeed(secret); } catch { return false; }
}

export function isValidContractId(id: string): boolean {
  try { return StrKey.isValidContract(id); } catch { return false; }
}

export function isValidTxHash(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

export function isValidAssetCode(code: string): boolean {
  return /^[a-zA-Z0-9]{1,12}$/.test(code);
}

export function getAddressType(address: string): 'account' | 'contract' | 'unknown' {
  if (isValidStellarAddress(address)) return 'account';
  if (isValidContractId(address)) return 'contract';
  return 'unknown';
}
