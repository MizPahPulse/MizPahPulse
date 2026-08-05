import { z } from 'zod';

/**
 * Validated environment variables for server-side use.
 * Validates all required environment variables at startup.
 */
const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().startsWith('postgresql://', {
    message: 'DATABASE_URL must be a valid PostgreSQL connection string',
  }),

  // Redis
  REDIS_URL: z.string().url().startsWith('redis://', {
    message: 'REDIS_URL must be a valid Redis connection string',
  }),

  // Stellar
  STELLAR_NETWORK: z.enum(['TESTNET', 'PUBLIC', 'FUTURENET', 'SANDBOX']).default('TESTNET'),
  STELLAR_HORIZON_URL: z.string().url().optional(),
  STELLAR_SOROBAN_RPC_URL: z.string().url().optional(),

  // WebSocket
  WS_PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Security
  JWT_SECRET: z.string().min(16).optional(),
  API_KEY_SECRET: z.string().min(16).optional(),
  WEBHOOK_SECRET: z.string().min(16).optional(),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Public (client-side)
  NEXT_PUBLIC_STELLAR_NETWORK: z.string().optional(),
  NEXT_PUBLIC_PULSE_CONTRACT_ID: z.string().optional(),
  NEXT_PUBLIC_WS_URL: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof EnvSchema>;

/**
 * Parse and validate environment variables.
 * Returns validated env and a list of warnings for missing optional vars.
 */
export function validateEnv(): { env: ValidatedEnv; warnings: string[] } {
  const warnings: string[] = [];

  // Extract all env vars from process.env (for Node.js) or from known globals
  const rawEnv: Record<string, string | undefined> = {};
  const requiredKeys = [
    'DATABASE_URL', 'REDIS_URL', 'STELLAR_NETWORK', 'WS_PORT',
    'CORS_ORIGIN', 'NODE_ENV', 'JWT_SECRET', 'API_KEY_SECRET',
    'WEBHOOK_SECRET', 'STELLAR_HORIZON_URL', 'STELLAR_SOROBAN_RPC_URL',
    'NEXT_PUBLIC_STELLAR_NETWORK', 'NEXT_PUBLIC_PULSE_CONTRACT_ID',
    'NEXT_PUBLIC_WS_URL',
  ];

  for (const key of requiredKeys) {
    if (typeof process !== 'undefined' && process.env) {
      rawEnv[key] = process.env[key];
    }
  }

  const result = EnvSchema.safeParse(rawEnv);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const missing = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs || ['missing']).join(', ')}`)
      .join('\n');

    console.error(`❌ Environment validation failed:\n${missing}`);

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed:\n${missing}`);
    }

    warnings.push(`Environment validation issues:\n${missing}`);
  }

  // Warn about missing secrets in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      warnings.push('WARNING: JWT_SECRET is weak or missing in production');
    }
    if (!process.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET.length < 16) {
      warnings.push('WARNING: WEBHOOK_SECRET is weak or missing in production');
    }
  }

  const data = result.success ? result.data : (rawEnv as unknown as ValidatedEnv);

  return { env: data, warnings };
}

/**
 * Get a single validated environment variable value.
 */
export function getEnvVar(key: keyof ValidatedEnv): string {
  const { env } = validateEnv();
  const value = env[key];
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return String(value);
}
