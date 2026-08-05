export function checkRequiredEnv(): { ok: boolean; missing: string[] } {
  const required = ['DATABASE_URL', 'REDIS_URL'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
  }
  return { ok: missing.length === 0, missing };
}

export function checkOptionalEnv(): { configured: string[]; unconfigured: string[] } {
  const optional = ['JWT_SECRET', 'WEBHOOK_SECRET', 'API_KEY_SECRET'];
  const configured = optional.filter((k) => process.env[k]);
  const unconfigured = optional.filter((k) => !process.env[k]);
  if (unconfigured.length > 0) {
    console.warn(`Optional env vars not configured: ${unconfigured.join(', ')}`);
  }
  return { configured, unconfigured };
}
