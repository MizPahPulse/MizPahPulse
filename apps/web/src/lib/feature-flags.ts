export const FEATURE_FLAGS = {
  ENABLE_WEBHOOKS: process.env.NEXT_PUBLIC_ENABLE_WEBHOOKS !== 'false',
  ENABLE_CONTRACT_INVOKE: process.env.NEXT_PUBLIC_ENABLE_CONTRACT_INVOKE !== 'false',
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
  ENABLE_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== 'false',
} as const;
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean { return FEATURE_FLAGS[feature]; }
