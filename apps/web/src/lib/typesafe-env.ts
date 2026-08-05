/**
 * Server-side environment variable accessor with type safety.
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

export function getEnv(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

export const serverEnv = {
  get databaseUrl() { return requireEnv('DATABASE_URL'); },
  get redisUrl() { return requireEnv('REDIS_URL'); },
  get stellarNetwork() { return getEnv('STELLAR_NETWORK', 'TESTNET'); },
  get nodeEnv() { return getEnv('NODE_ENV', 'development'); },
  get jwtSecret() { return getEnv('JWT_SECRET', 'dev-secret'); },
  get isProduction() { return process.env.NODE_ENV === 'production'; },
  get isTest() { return process.env.NODE_ENV === 'test'; },
};
