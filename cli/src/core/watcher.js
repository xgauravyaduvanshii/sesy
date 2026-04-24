/**
 * sesy — watcher.js
 * Polls a local HTTP port until it responds or times out.
 */

import http from 'node:http';
import { log } from '../utils/logger.js';

const TRANSIENT_ERROR_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH']);

/**
 * Start watching a port. Returns a stop function.
 * @param {object} options
 * @param {number} options.port
 * @param {number} options.pollIntervalMs
 * @param {number} options.pollTimeoutMs
 * @param {() => void} options.onReady
 * @param {() => void} options.onTimeout
 * @param {(details: { attempt: number, elapsedMs: number }) => void} [options.onRetry]
 * @returns {() => void}
 */
export function watchPort(options) {
  const {
    port,
    pollIntervalMs,
    pollTimeoutMs,
    onReady,
    onTimeout,
    onRetry,
  } = options;

  let attempt = 0;
  let stopped = false;
  let checking = false;
  let intervalId;
  let timeoutId;
  let activeRequest = null;
  const startedAt = Date.now();

  const stop = () => {
    stopped = true;

    if (intervalId) {
      clearInterval(intervalId);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (activeRequest) {
      activeRequest.destroy();
      activeRequest = null;
    }
  };

  const check = () => {
    if (stopped || checking) {
      return;
    }

    checking = true;
    attempt += 1;

    const request = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/',
      },
      (response) => {
        response.resume();
        activeRequest = null;
        checking = false;

        if (stopped) {
          return;
        }

        stop();
        onReady();
      },
    );

    activeRequest = request;

    request.setTimeout(Math.min(2000, pollIntervalMs), () => {
      const timeoutError = new Error('Request timed out while waiting for localhost.');
      timeoutError.code = 'ETIMEDOUT';
      request.destroy(timeoutError);
    });

    request.on('error', (error) => {
      activeRequest = null;
      checking = false;

      if (stopped) {
        return;
      }

      const elapsedMs = Date.now() - startedAt;

      if (error.code === 'ECONNREFUSED') {
        onRetry?.({ attempt, elapsedMs });
        return;
      }

      if (TRANSIENT_ERROR_CODES.has(error.code)) {
        log.debug(`Transient network error while polling localhost:${port}: ${error.code}`);
        onRetry?.({ attempt, elapsedMs });
        return;
      }

      log.warn(`Unexpected network error while polling localhost:${port}: ${error.message}`);
      onRetry?.({ attempt, elapsedMs });
    });
  };

  timeoutId = setTimeout(() => {
    if (stopped) {
      return;
    }

    stop();
    onTimeout();
  }, pollTimeoutMs);

  intervalId = setInterval(check, pollIntervalMs);
  check();

  return stop;
}
