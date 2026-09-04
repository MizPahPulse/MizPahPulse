import { prisma } from '@mizpah-pulse/database';
import { fetchTransaction } from '@mizpah-pulse/stellar';
import { errorResponse, successResponse, ErrorCode, createRequestId } from '@/lib/api-errors';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { rateLimit } from '@/lib/rate-limit';
import { requireApiKey } from '@/lib/api-key';
import { withRequestId } from '@/lib/request-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/transactions/[hash]
 *
 * Transaction status lookup (issue #42). The Transaction table is the primary
 * source; when a hash is not indexed yet the endpoint falls back to Horizon so
 * clients get one answer regardless of ingestion lag.
 *
 * Status semantics:
 *  - `success`    — transaction finalized successfully (ledger or DB)
 *  - `failed`     — transaction finalized with a failed result
 *  - `pending`    — recorded locally but its result XDR is not available yet
 *  - `not-found`  — unknown to both the DB and Horizon
 */
type TxStatus = 'success' | 'failed' | 'pending' | 'not-found';

function statusFromResult(successful: boolean, resultXdr: string | null): TxStatus {
  if (!successful) return 'failed';
  return resultXdr ? 'success' : 'pending';
}

/** A stable, small view of a transaction for status consumers. */
function toStatusView(tx: {
  hash: string;
  sourceAccount: string;
  fee: string;
  operationCount: number;
  memo: string | null;
  successful: boolean;
  resultCode: string | null;
  ledgerSequence: bigint;
  createdAt: Date;
  envelopeXdr: string | null;
  resultXdr: string | null;
}): Record<string, unknown> {
  return {
    hash: tx.hash,
    sourceAccount: tx.sourceAccount,
    fee: tx.fee,
    operationCount: tx.operationCount,
    memo: tx.memo,
    resultCode: tx.resultCode,
    ledgerSequence: tx.ledgerSequence.toString(),
    createdAt: tx.createdAt,
    envelopeXdr: tx.envelopeXdr,
    resultXdr: tx.resultXdr,
    status: statusFromResult(tx.successful, tx.resultXdr),
  };
}

/**
 * GET /api/v1/transactions/[hash]
 *
 * Returns the status of a transaction, resolving from the local Transaction
 * table first and falling back to Horizon (`getTransaction`) when the hash is
 * not indexed locally.
 */
async function GETHandler(request: Request, props: { params: Promise<{ hash: string }> }) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 120,
    windowMs: 60_000,
    keyPrefix: 'transactions:status',
  });
  if (rateLimitResult.limited) return rateLimitResult.response!;

  const auth = await requireApiKey(request);
  if (auth.response) return auth.response;

  const requestId = request.headers.get('X-Request-ID') ?? createRequestId();

  try {
    const { hash } = await props.params;
    const normalized = hash?.trim();

    if (!normalized || !/^[A-Fa-f0-9]{64}$/.test(normalized)) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Transaction hash must be a 64-character hex string',
        undefined,
        requestId,
      );
    }

    const dbTx = await prisma.transaction.findUnique({ where: { hash: normalized } });

    if (dbTx) {
      return successResponse(toStatusView(dbTx), 200, undefined, {
        'X-Request-ID': requestId,
        ...rateLimitResult.headers,
      });
    }

    // Fall back to Horizon for transactions that are not indexed locally yet.
    // A record loaded from the network is always finalized, so its status is
    // success/failed directly (never "pending").
    try {
      const record = await fetchTransaction(normalized);
      const recordAny = record as unknown as {
        successful?: boolean;
        result_xdr?: string;
        envelope_xdr?: string;
      };
      const successful = recordAny.successful !== false;
      return successResponse(
        {
          hash: normalized,
          status: (successful ? 'success' : 'failed') as TxStatus,
          resultXdr: recordAny.result_xdr ?? null,
          envelopeXdr: recordAny.envelope_xdr ?? null,
          source: 'horizon',
        },
        200,
        undefined,
        { 'X-Request-ID': requestId, ...rateLimitResult.headers },
      );
    } catch (horizonError) {
      const err = horizonError as { response?: { status?: number }; status?: number };
      const status = err.response?.status ?? err.status;
      if (status === 404) {
        return successResponse(
          { hash: normalized, status: 'not-found' as TxStatus },
          200,
          undefined,
          { 'X-Request-ID': requestId, ...rateLimitResult.headers },
        );
      }
      return errorResponse(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Horizon is unreachable — transaction status could not be resolved',
        undefined,
        requestId,
      );
    }
  } catch (error) {
    return prismaErrorResponse(error, 'Failed to retrieve transaction status', requestId);
  }
}

export const GET = withRequestId(GETHandler);
