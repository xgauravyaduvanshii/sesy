/**
 * sesy — status.js
 * Reports configuration, environment, and current port reachability.
 */

import { access, readFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';
import { DEFAULTS } from '../constants.js';
import { loadConfig } from '../core/config.js';
import { log } from '../utils/logger.js';

async function isPortReachable(port) {
  return new Promise((resolve) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: '/' }, (response) => {
      response.resume();
      resolve(true);
    });

    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });

    request.on('error', () => resolve(false));
  });
}

async function getVersion() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const packagePath = path.resolve(currentDir, '../../package.json');
  const raw = await readFile(packagePath, 'utf8');
  return JSON.parse(raw).version;
}

/**
 * Run the `sesy status` command.
 * @returns {Promise<void>}
 */
export async function runStatusCommand() {
  try {
    log.info('sesy status');
    log.blank();

    let configLabel = 'no config found';
    let port = DEFAULTS.PORT;

    try {
      const config = await loadConfig();
      port = config.port;
      configLabel = `${DEFAULTS.CONFIG_FILENAME} ✔`;
    } catch {
      configLabel = 'no config found';
    }

    const reachable = await isPortReachable(port);

    let electronLabel = 'not found';
    try {
      await access(electronPath);
      electronLabel = `${electronPath} ✔`;
    } catch {
      electronLabel = 'not found';
    }

    log.info(`Config          ${configLabel}`);
    log.info(`Port            ${port} — ${reachable ? 'reachable ✔' : 'not reachable'}`);
    log.info(`Electron        ${electronLabel}`);
    log.info(`sesy version    ${await getVersion()}`);
    log.info(`Node.js         ${process.version}`);
    log.info(`Platform        ${process.platform} ${os.arch()}`);
  } catch (error) {
    throw error;
  }
}
