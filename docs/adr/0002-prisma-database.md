# ADR-0002: Prisma 6 database layer

- Status: Accepted
- Date: 2026-08-06

## Context

The platform needs a persistent relational store for events, webhooks,
sessions, and operational data with a consistent client across every app.

## Decision

Use Prisma 6 in `packages/database`. The schema is the source of truth, the
client is generated into the package, and `db:generate`, `db:migrate`,
`db:push`, `db:seed`, and `db:studio` are exposed as workspace scripts.

## Consequences

- Schema changes are reviewable and versioned.
- Apps share one generated client instead of duplicating data access.
- Runtime migrations must be coordinated with deployments.
