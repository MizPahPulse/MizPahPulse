import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import type { LiveEvent } from '@mizpah-pulse/types';
import { incrementMetric, getWsMetrics } from './metrics';
import { ConnectionLimiter } from './connection-limiter';

/**
 * MizpahPulse WebSocket Server
 *
 * Provides real-time event streaming to connected clients.
 * Subscribes to Redis Pub/Sub for processed event broadcasts.
 * Supports room-based filtering by event type, category, and accounts.
 */

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────
const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_CHANNEL = 'mizpah-pulse:events';

// ──────────────────────────────────────────────
// HTTP + Socket.io Setup
// ──────────────────────────────────────────────
const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      service: 'MizpahPulse WebSocket Server',
      status: 'running',
      version: '0.0.1',
      uptime: process.uptime(),
    }),
  );
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  pingInterval: 25000,
  pingTimeout: 20000,
  transports: ['websocket', 'polling'],
});

// ──────────────────────────────────────────────
// Redis Pub/Sub Client
// ──────────────────────────────────────────────
const sub = new Redis(REDIS_URL);

sub.on('connect', () => {
  console.log('[WS] Redis subscriber connected');
});

sub.on('error', (err) => {
  console.error('[WS] Redis subscriber error:', err);
});

// Subscribe to processed event channels
sub.subscribe(REDIS_CHANNEL, (err) => {
  if (err) {
    console.error('[WS] Failed to subscribe to Redis channel:', err);
  } else {
    console.log(`[WS] Subscribed to Redis channel: ${REDIS_CHANNEL}`);
  }
});

// Handle incoming events from Redis Pub/Sub
sub.on('message', (_channel, message) => {
  try {
    const event: LiveEvent = JSON.parse(message);

    // Broadcast by event type (room = eventType)
    io.to(event.eventType).emit('event', event);

    // Broadcast to category room
    const category = (event.data as { category?: string }).category;
    if (category) {
      io.to(`category:${category}`).emit('event', event);
    }

    // Broadcast to account-specific room
    const accountId = (event.data as { accountId?: string }).accountId;
    if (accountId) {
      io.to(`account:${accountId}`).emit('event', event);
    }

    // Also broadcast to the general feed
    io.to('feed:all').emit('event', event);
  } catch (err) {
    console.error('[WS] Error processing Redis message:', err);
  }
});

// ──────────────────────────────────────────────
// Socket.io Connection Handling
// ──────────────────────────────────────────────
const connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  peakConnections: 0,
};

const connectionLimiter = new ConnectionLimiter(parseInt(process.env.MAX_CONNECTIONS || '10000', 10));

io.on('connection', (socket) => {
  // Enforce a max connection limit to protect the server from abuse
  if (!connectionLimiter.canConnect()) {
    socket.emit('error', { code: 'CONNECTION_LIMIT_REACHED', message: 'Server is at max capacity' });
    socket.disconnect(true);
    return;
  }

  connectionStats.totalConnections++;
  connectionStats.activeConnections = io.engine.clientsCount;
  if (connectionStats.activeConnections > connectionStats.peakConnections) {
    connectionStats.peakConnections = connectionStats.activeConnections;
  }
  incrementMetric('connections');

  console.log(
    `[WS] Client connected: ${socket.id} (active: ${connectionStats.activeConnections})`,
  );

  // Auto-join the all-events feed
  socket.join('feed:all');

  // Client subscribes to specific event types
  socket.on('subscribe:eventTypes', (eventTypes: string[]) => {
    for (const eventType of eventTypes) {
      socket.join(eventType);
    }
  });

  // Client subscribes to categories
  socket.on('subscribe:categories', (categories: string[]) => {
    for (const category of categories) {
      socket.join(`category:${category}`);
    }
  });

  // Client subscribes to specific accounts
  socket.on('subscribe:accounts', (accountIds: string[]) => {
    for (const accountId of accountIds) {
      socket.join(`account:${accountId}`);
    }
  });

  // Client unsubscribes from specific event types
  socket.on('unsubscribe:eventTypes', (eventTypes: string[]) => {
    for (const eventType of eventTypes) {
      socket.leave(eventType);
    }
  });

  // Client unsubscribes from categories
  socket.on('unsubscribe:categories', (categories: string[]) => {
    for (const category of categories) {
      socket.leave(`category:${category}`);
    }
  });

  // Client unsubscribes from accounts
  socket.on('unsubscribe:accounts', (accountIds: string[]) => {
    for (const accountId of accountIds) {
      socket.leave(`account:${accountId}`);
    }
  });

  // Client requests stats
  socket.on('stats', () => {
    incrementMetric('messagesReceived');
    socket.emit('stats', {
      activeConnections: io.engine.clientsCount,
      totalConnections: connectionStats.totalConnections,
      peakConnections: connectionStats.peakConnections,
      uptime: process.uptime(),
      metrics: getWsMetrics(),
    });
  });

  // Disconnect
  socket.on('disconnect', (reason) => {
    connectionStats.activeConnections = io.engine.clientsCount;
    console.log(
      `[WS] Client disconnected: ${socket.id} (${reason}, active: ${connectionStats.activeConnections})`,
    );
  });
});

// ──────────────────────────────────────────────
// Health check endpoint
// ──────────────────────────────────────────────
io.engine.on('connection_error', (err) => {
  console.error('[WS] Connection error:', err.message);
});

// ──────────────────────────────────────────────
// Broadcast helper (called by other services)
// ──────────────────────────────────────────────
export function broadcastEvent(event: LiveEvent) {
  io.to(event.channel).emit('event', event);
  io.to('feed:all').emit('event', event);
}

// ──────────────────────────────────────────────
// Startup
// ──────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log('═══════════════════════════════════════════');
  console.log('  MizpahPulse — WebSocket Server');
  console.log(`  Listening on port ${PORT}`);
  console.log('═══════════════════════════════════════════');
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[WS] Shutting down...');
  await sub.quit();
  io.close();
  httpServer.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { io, httpServer };
