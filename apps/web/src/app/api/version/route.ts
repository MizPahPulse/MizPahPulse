import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/version
 *
 * Returns API version information and service status.
 * No authentication required - useful for clients and monitoring.
 */
export async function GET() {
  return NextResponse.json(
    {
      service: 'MizPahPulse API',
      version: '0.2.0',
      apiVersion: 'v1',
      environment: process.env.NODE_ENV || 'development',
      stellarNetwork: process.env.STELLAR_NETWORK || 'TESTNET',
      timestamp: new Date().toISOString(),
      endpoints: {
        events: '/api/v1/events',
        search: '/api/v1/search',
        contracts: '/api/v1/contracts',
        accounts: '/api/v1/accounts',
        webhooks: '/api/v1/webhooks',
        stats: '/api/v1/stats',
        health: '/api/health',
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}
