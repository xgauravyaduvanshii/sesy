/**
 * sesy — watch.js
 * Watches the forwarded port, launches Electron, and manages shutdown flow.
 */

import process from 'node:process';
import { DEFAULTS, EXIT_CODES } from '../constants.js';
import { loadConfig } from '../core/config.js';
import { launchElectron } from '../core/launcher.js';
import { watchPort } from '../core/watcher.js';
import { Errors } from '../utils/errors.js';
import { log } from '../utils/logger.js';

function buildRuntimeConfig(config, options) {
  return {
    port: Number(options.port ?? config.port ?? DEFAULTS.PORT),
    windowWidth: Number(options.width ?? config.windowWidth ?? DEFAULTS.WINDOW_WIDTH),
    windowHeight: Number(options.height ?? config.windowHeight ?? DEFAULTS.WINDOW_HEIGHT),
    pollIntervalMs: Number(config.pollIntervalMs ?? DEFAULTS.POLL_INTERVAL_MS),
    pollTimeoutMs: Number((options.timeout ? options.timeout * 1000 : config.pollTimeoutMs) ?? DEFAULTS.POLL_TIMEOUT_MS),
    electronArgs: config.electronArgs ?? [],
    env: config.env ?? {},
  };
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

/**
 * Run the `sesy watch` command.
 * @param {object} options
 * @param {number} [options.port]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {number} [options.timeout]
 * @param {boolean} [options.keepWatching]
 * @returns {Promise<void>}
 */
export async function runWatchCommand(options = {}) {
  let electronChild = null;
  let stopWatching = null;
  let shuttingDown = false;
  let cleanedUp = false;
  let activeLine = '';

  const clearSpinner = () => {
    if (process.stdout.isTTY && activeLine) {
      process.stdout.write('\r\x1b[2K');
      activeLine = '';
    }
  };

  const shutdown = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    shuttingDown = true;
    clearSpinner();
    log.info('Shutting down...');
    stopWatching?.();

    if (electronChild && !electronChild.killed) {
      electronChild.kill('SIGTERM');
    }

    log.success('Done. Goodbye!');
    process.exit(EXIT_CODES.SUCCESS);
  };

  process.once('SIGINT', shutdown);

  try {
    let loadedConfig = {};

    try {
      loadedConfig = await loadConfig();
    } catch (error) {
      if (error.message?.startsWith('No .sesy.json found')) {
        log.warn('No .sesy.json found. Using CLI defaults for this run.');
      } else {
        throw error;
      }
    }

    const config = buildRuntimeConfig(loadedConfig, options);

    log.banner();
    log.info(`Watching localhost:${config.port} for your Electron app...`);
    log.info(`(SSH tunnel must be active. Timeout: ${Math.round(config.pollTimeoutMs / 1000)}s)`);
    log.blank();

    const startWatching = () => new Promise((resolve, reject) => {
      stopWatching = watchPort({
        port: config.port,
        pollIntervalMs: config.pollIntervalMs,
        pollTimeoutMs: config.pollTimeoutMs,
        onReady: async () => {
          clearSpinner();
          log.success(`Port ${config.port} is live!`);
          log.info('Launching Electron window...');

          try {
            electronChild = await launchElectron(`http://localhost:${config.port}`, {
              windowWidth: config.windowWidth,
              windowHeight: config.windowHeight,
              electronArgs: config.electronArgs,
              env: config.env,
            });
            log.success('Done! Your app is running.');
            log.blank();
            log.info(`Your app is running at localhost:${config.port}`);
            log.info('Press Ctrl+C to stop.');
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        onTimeout: () => {
          clearSpinner();
          reject(Errors.portTimeout(config.port, config.pollTimeoutMs));
        },
        onRetry: ({ attempt, elapsedMs }) => {
          const seconds = (elapsedMs / 1000).toFixed(1);
          const message = `⏳ Waiting for localhost:${config.port} ... (${seconds}s elapsed, attempt ${attempt})`;

          if (process.stdout.isTTY) {
            activeLine = message;
            process.stdout.write(`\r${message}`);
          } else {
            log.info(`[attempt ${attempt}] not ready yet... (${seconds}s elapsed)`);
          }
        },
      });
    });

    do {
      await startWatching();

      if (!electronChild) {
        break;
      }

      const { signal } = await waitForExit(electronChild);
      electronChild = null;

      if (shuttingDown) {
        break;
      }

      if (!options.keepWatching) {
        log.info('Electron window closed.');
        break;
      }

      log.warn(`Electron exited${signal ? ` (${signal})` : ''}. Re-watching the port...`);
    } while (options.keepWatching);
  } finally {
    clearSpinner();
    process.removeListener('SIGINT', shutdown);
  }
}
