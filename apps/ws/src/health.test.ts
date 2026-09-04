import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHealthPayload } from './health';

test('buildHealthPayload reports ok with connection and redis state', () => {
  const payload = buildHealthPayload({
    service: 'MizpahPulse WebSocket Server',
    version: '0.0.1',
    uptime: 12.5,
    activeConnections: 3,
    totalConnections: 10,
    peakConnections: 5,
    redisConnected: true,
  });

  assert.equal(payload.status, 'ok');
  assert.equal(payload.service, 'MizpahPulse WebSocket Server');
  assert.equal(payload.version, '0.0.1');
  assert.equal(payload.uptime, 12.5);
  assert.equal(payload.redis, 'connected');
  assert.deepEqual(payload.connections, { active: 3, total: 10, peak: 5 });
  assert.ok(payload.timestamp, 'timestamp is present');
  assert.ok(!Number.isNaN(Date.parse(payload.timestamp)), 'timestamp is valid ISO');
});

test('buildHealthPayload reflects a disconnected redis subscriber', () => {
  const payload = buildHealthPayload({
    service: 'ws',
    version: '0.0.1',
    uptime: 1,
    activeConnections: 0,
    totalConnections: 0,
    peakConnections: 0,
    redisConnected: false,
  });

  assert.equal(payload.redis, 'disconnected');
  assert.deepEqual(payload.connections, { active: 0, total: 0, peak: 0 });
});
