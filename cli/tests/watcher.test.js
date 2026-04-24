/**
 * sesy — watcher.test.js
 * Verifies that the port watcher detects readiness, timeout, and cancellation correctly.
 */

import http from 'node:http';
import { once } from 'node:events';
import { describe, expect, test } from '@jest/globals';
import { watchPort } from '../src/core/watcher.js';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreePort() {
  const server = http.createServer((request, response) => {
    response.writeHead(200);
    response.end('ok');
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  server.close();
  await once(server, 'close');
  return port;
}

describe('watchPort', () => {
  test('calls onReady when a test HTTP server starts', async () => {
    const port = await getFreePort();

    await new Promise((resolve, reject) => {
      let server;
      const stop = watchPort({
        port,
        pollIntervalMs: 50,
        pollTimeoutMs: 1500,
        onReady: async () => {
          stop();
          server?.close();
          resolve();
        },
        onTimeout: () => reject(new Error('Expected onReady before timeout.')),
      });

      setTimeout(() => {
        server = http.createServer((request, response) => {
          response.writeHead(200);
          response.end('ok');
        });
        server.listen(port, '127.0.0.1');
      }, 200);
    });
  });

  test('calls onTimeout after timeout when no server responds', async () => {
    const port = await getFreePort();

    await new Promise((resolve, reject) => {
      watchPort({
        port,
        pollIntervalMs: 25,
        pollTimeoutMs: 200,
        onReady: () => reject(new Error('Expected timeout, but watcher became ready.')),
        onTimeout: resolve,
      });
    });
  });

  test('stop prevents callbacks after being called', async () => {
    const port = await getFreePort();
    let callbackCount = 0;

    const stop = watchPort({
      port,
      pollIntervalMs: 25,
      pollTimeoutMs: 200,
      onReady: () => {
        callbackCount += 1;
      },
      onTimeout: () => {
        callbackCount += 1;
      },
    });

    stop();
    await wait(300);
    expect(callbackCount).toBe(0);
  });

  test('handles ECONNREFUSED and keeps retrying', async () => {
    const port = await getFreePort();

    await new Promise((resolve, reject) => {
      let retries = 0;

      watchPort({
        port,
        pollIntervalMs: 30,
        pollTimeoutMs: 250,
        onReady: () => reject(new Error('Expected timeout after retries.')),
        onTimeout: () => {
          expect(retries).toBeGreaterThan(0);
          resolve();
        },
        onRetry: ({ attempt }) => {
          retries = attempt;
        },
      });
    });
  });

  test('respects pollIntervalMs timing approximately', async () => {
    const port = await getFreePort();
    const timestamps = [];

    await new Promise((resolve) => {
      watchPort({
        port,
        pollIntervalMs: 60,
        pollTimeoutMs: 260,
        onReady: resolve,
        onTimeout: resolve,
        onRetry: () => {
          timestamps.push(Date.now());
        },
      });
    });

    expect(timestamps.length).toBeGreaterThanOrEqual(2);
    const intervals = timestamps.slice(1).map((value, index) => value - timestamps[index]);
    expect(intervals.every((interval) => interval >= 40)).toBe(true);
  });
});
