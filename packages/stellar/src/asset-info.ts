/** Asset information and formatting utilities */

export interface AssetInfo {
  code: string;
  issuer?: string;
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
}

export function formatAsset(asset: AssetInfo): string {
  if (asset.type === 'native') return 'XLM';
  return asset.code;
}

export function formatAssetWithIssuer(asset: AssetInfo): string {
  if (asset.type === 'native') return 'XLM (native)';
  if (asset.issuer) return `${asset.code}:${asset.issuer.slice(0, 8)}...`;
  return asset.code;
}

export function isNativeAsset(asset: AssetInfo): boolean {
  return asset.type === 'native' || asset.code === 'XLM';
}

export function assetToKey(asset: AssetInfo): string {
  if (asset.type === 'native') return 'XLM';
  return `${asset.code}-${asset.issuer || 'unknown'}`;
}
