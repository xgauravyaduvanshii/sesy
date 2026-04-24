/**
 * sesy — doctor.js
 * Runs environment and project health checks with actionable hints.
 */

import { access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import process from 'node:process';
import electronPath from 'electron';
import { DEFAULTS, EXIT_CODES } from '../constants.js';
import { loadConfig } from '../core/config.js';
import { log } from '../utils/logger.js';

function hasMinimumNodeVersion(version, minimumMajor) {
  const major = Number(version.replace(/^v/, '').split('.')[0]);
  return major >= minimumMajor;
}

function findSesyBinary() {
  const command = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(command, ['sesy'], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null;
}

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

function printCheck(ok, label, detail, hint = null) {
  if (ok) {
    log.success(`${label.padEnd(22)} ${detail}`);
    return;
  }

  log.error(`${label.padEnd(22)} ${detail}`);

  if (hint) {
    log.warn(`Hint: ${hint}`);
  }
}

/**
 * Run the `sesy doctor` command.
 * @returns {Promise<void>}
 */
export async function runDoctorCommand() {
  let hasFailures = false;

  try {
    const nodeOk = hasMinimumNodeVersion(process.version, 18);
    printCheck(nodeOk, 'Node.js >= 18', process.version, 'Upgrade Node.js from nodejs.org.');
    hasFailures ||= !nodeOk;

    const binaryPath = findSesyBinary();
    printCheck(Boolean(binaryPath), 'sesy installed', binaryPath ?? 'not found', "Run 'npm i @xgauravyaduvanshii/sesy'.");
    hasFailures ||= !binaryPath;

    let electronOk = false;
    try {
      await access(electronPath);
      electronOk = true;
    } catch {
      electronOk = false;
    }
    printCheck(electronOk, 'Electron binary', electronOk ? `found at ${electronPath}` : 'not found', 'Reinstall sesy to restore Electron.');
    hasFailures ||= !electronOk;

    let config;
    try {
      config = await loadConfig();
      printCheck(true, DEFAULTS.CONFIG_FILENAME, 'present and valid');
    } catch (error) {
      printCheck(false, DEFAULTS.CONFIG_FILENAME, error.message, "Run 'sesy init' or edit the config file.");
      hasFailures = true;
    }

    if (config) {
      const reachable = await isPortReachable(config.port);
      printCheck(
        reachable,
        'Port reachable',
        reachable ? `localhost:${config.port}` : `localhost:${config.port} not reachable`,
        'Check your SSH tunnel and remote dev server.',
      );
      hasFailures ||= !reachable;
    } else {
      printCheck(false, 'Port reachable', `localhost:${DEFAULTS.PORT} not checked`, 'Create a valid .sesy.json first.');
      hasFailures = true;
    }

    if (hasFailures) {
      process.exitCode = EXIT_CODES.ERROR;
      return;
    }

    log.blank();
    log.success(`All checks passed on ${os.platform()} ${os.arch()}.`);
  } catch (error) {
    throw error;
  }
}
