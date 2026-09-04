'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getClientEnv } from '@/lib/env-client';

interface UseWebSocketOptions {
  eventTypes?: string[];
  categories?: string[];
  accountIds?: string[];
  enabled?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  /**
   * Sticky flag: true once the socket has connected at least once. Lets the UI
   * distinguish "still establishing the first connection" from "the connection
   * dropped after having been live".
   */
  everConnected: boolean;
  lastEvent: unknown;
  connectionStats: {
    activeConnections?: number;
    totalConnections?: number;
  } | null;
  subscribe: (eventTypes: string[]) => void;
  unsubscribe: (eventTypes: string[]) => void;
  /**
   * Tear down the current socket and open a fresh connection. Used by the
   * "Retry now" action on the reconnecting banner.
   */
  reconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { eventTypes = [], categories = [], accountIds = [], enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [everConnected, setEverConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<unknown>(null);
  const [connectionStats, setConnectionStats] =
    useState<UseWebSocketReturn['connectionStats']>(null);
  // Bumped by reconnect() to force the effect below to open a brand-new socket.
  const [connectionGeneration, setConnectionGeneration] = useState(0);

  // Stable keys to avoid re-subscription loops from new array references
  const eventTypesKey = useMemo(() => eventTypes.join(','), [eventTypes]);
  const categoriesKey = useMemo(() => categories.join(','), [categories]);
  const accountIdsKey = useMemo(() => accountIds.join(','), [accountIds]);

  useEffect(() => {
    if (!enabled) return;

    const wsUrl = getClientEnv().wsUrl;
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setEverConnected(true);

      if (eventTypes.length > 0) {
        socket.emit('subscribe:eventTypes', eventTypes);
      }
      if (categories.length > 0) {
        socket.emit('subscribe:categories', categories);
      }
      if (accountIds.length > 0) {
        socket.emit('subscribe:accounts', accountIds);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('event', (data: unknown) => {
      setLastEvent(data);
    });

    socket.on('stats', (stats: UseWebSocketReturn['connectionStats']) => {
      setConnectionStats(stats);
    });

    socket.on('connect_error', (err: Error) => {
      console.error('[WS] Connection error:', err.message);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // Filter arrays are intentionally excluded — handled by the subscription
    // effect below so changing them never tears down the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, connectionGeneration]);

  // Re-subscribe when filter arrays change (using stable keys). The raw arrays
  // are intentionally omitted: re-emitting is keyed off the joined keys below.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;

    socket.emit('subscribe:eventTypes', eventTypes);
    socket.emit('subscribe:categories', categories);
    socket.emit('subscribe:accounts', accountIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypesKey, categoriesKey, accountIdsKey, isConnected]);

  const subscribe = useCallback((types: string[]) => {
    socketRef.current?.emit('subscribe:eventTypes', types);
  }, []);

  const unsubscribe = useCallback((types: string[]) => {
    socketRef.current?.emit('unsubscribe:eventTypes', types);
  }, []);

  const reconnect = useCallback(() => {
    setConnectionGeneration((generation) => generation + 1);
  }, []);

  return {
    isConnected,
    everConnected,
    lastEvent,
    connectionStats,
    subscribe,
    unsubscribe,
    reconnect,
  };
}
