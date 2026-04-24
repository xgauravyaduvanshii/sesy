/**
 * sesy — launcher.js
 * Creates a temporary Electron bridge entry file and launches a local Electron window.
 */

import { access, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import electronPath from 'electron';
import { DEFAULTS } from '../constants.js';
import { Errors, SesyError } from '../utils/errors.js';

const bridgeSource = `const { app, BrowserWindow } = require('electron');

function buildTitle(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return 'sesy — ' + parsed.hostname + ':' + parsed.port;
  } catch {
    return 'sesy — ' + rawUrl;
  }
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: Number(process.env.SESY_WIDTH) || 1280,
    height: Number(process.env.SESY_HEIGHT) || 800,
    title: buildTitle(process.env.SESY_URL),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(process.env.SESY_URL);
});

app.on('window-all-closed', () => app.quit());
`;

async function ensureBridgeFile() {
  const tempDir = path.resolve(os.tmpdir(), DEFAULTS.TEMP_DIR_NAME);
  const bridgeMainPath = path.resolve(tempDir, 'bridge-main.cjs');
  await mkdir(tempDir, { recursive: true });
  await writeFile(bridgeMainPath, bridgeSource, 'utf8');
  return bridgeMainPath;
}

/**
 * Launch an Electron window loading the given URL.
 * @param {string} url
 * @param {object} options
 * @param {number} [options.windowWidth]
 * @param {number} [options.windowHeight]
 * @param {string[]} [options.electronArgs]
 * @param {Record<string, string>} [options.env]
 * @returns {Promise<import('node:child_process').ChildProcess>}
 */
export async function launchElectron(url, options = {}) {
  try {
    if (!electronPath) {
      throw Errors.electronNotFound();
    }

    await access(electronPath);
    const bridgeMainPath = await ensureBridgeFile();

    const child = await new Promise((resolve, reject) => {
      const spawned = spawn(electronPath, [bridgeMainPath, ...(options.electronArgs ?? [])], {
        env: {
          ...process.env,
          SESY_URL: url,
          SESY_WIDTH: String(options.windowWidth ?? DEFAULTS.WINDOW_WIDTH),
          SESY_HEIGHT: String(options.windowHeight ?? DEFAULTS.WINDOW_HEIGHT),
          ...options.env,
        },
        stdio: 'inherit',
      });

      spawned.once('spawn', () => resolve(spawned));
      spawned.once('error', (error) => {
        reject(new SesyError(
          `Electron failed to start: ${error.message}`,
          'Run `sesy doctor` to confirm the Electron binary is available.',
        ));
      });
    });

    return child;
  } catch (error) {
    if (error instanceof SesyError) {
      throw error;
    }

    throw Errors.electronNotFound();
  }
}
