import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionLimiter } from './connection-limiter';

test('allows connections up to the configured max, then rejects', () => {
  const limiter = new ConnectionLimiter(2);
  assert.equal(limiter.canConnect(), true);
  limiter.addConnection();
  limiter.addConnection();
  assert.equal(limiter.canConnect(), false);

  const stats = limiter.getStats();
  assert.equal(stats.current, 2);
  assert.equal(stats.max, 2);
  assert.equal(stats.available, 0);
});

test('frees a slot after removeConnection', () => {
  const limiter = new ConnectionLimiter(1);
  limiter.addConnection();
  assert.equal(limiter.canConnect(), false);

  limiter.removeConnection();
  assert.equal(limiter.canConnect(), true);
  assert.equal(limiter.getStats().available, 1);
});

test('removeConnection never drives the counter below zero', () => {
  const limiter = new ConnectionLimiter(5);
  limiter.removeConnection();
  limiter.removeConnection();
  limiter.removeConnection();
  assert.equal(limiter.getStats().current, 0);
});

test('zero-max limiter rejects everything', () => {
  const limiter = new ConnectionLimiter(0);
  assert.equal(limiter.canConnect(), false);
  assert.equal(limiter.getStats().available, 0);
});
