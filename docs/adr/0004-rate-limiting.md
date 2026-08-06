# ADR-0004: Redis-backed rate limiting

- Status: Accepted
- Date: 2026-08-06

## Context

Public API routes and authentication endpoints need protection against burst
traffic without introducing a separate rate-limit service.

## Decision

Implement rate limiting in `apps/web/src/lib/rate-limit.ts` with Redis-backed
fixed and sliding windows and an in-memory fallback when Redis is unavailable.
Limits are keyed by identifier and bucket and return 429 responses with
remaining-limit diagnostics.

## Consequences

- Limits work during local development without Redis.
- The in-memory fallback is not shared across instances, so production should
  always provide Redis.
- Diagnostic metadata makes limit behavior observable.
