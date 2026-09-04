# ADR-0001: Monorepo layout

- Status: Accepted
- Date: 2026-08-06

## Context

The project needs a web dashboard, a WebSocket service, an ingestion worker,
shared TypeScript types, a shared database client, and a Soroban smart
contract in one repository without duplicating interfaces.

## Decision

Use a Turborepo monorepo with `apps/web`, `apps/ws`, `apps/ingester`,
`packages/*` for shared code, and `contracts/pulse` for the smart contract.
Root npm scripts delegate to workspace tasks.

## Consequences

- Shared types and the Prisma client are imported directly by the apps.
- Apps can be developed, tested, and deployed independently.
- Root scripts centralize common workflows such as `dev`, `test`, and `build`.
