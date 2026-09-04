# ADR-0003: Socket.IO WebSocket service

- Status: Accepted
- Date: 2026-08-06

## Context

The dashboard needs real-time event delivery without polling or page
refreshes, and the ingester must publish events to connected clients.

## Decision

Run a dedicated `apps/ws` service using Socket.IO. The ingester publishes to
Redis Pub/Sub and the WebSocket service broadcasts to connected clients. The
web app connects through `socket.io-client`.

## Consequences

- Real-time updates scale independently from the web app.
- Redis becomes a required component for multi-instance broadcasts.
- Connection limits and reconnection behavior must be explicit.
