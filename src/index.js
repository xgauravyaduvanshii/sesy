/**
 * sesy-guard — index.js
 * Public API. Call initSesyGuard() at the top of your Electron main.js.
 */

import { createRequire } from 'node:module';
import { getDetectionReason, isHeadlessEnvironment } from './detector.js';
import { Errors, SesyGuardError } from './errors.js';
import { injectHeadlessFlags } from './injector.js';
import { log } from './logger.js';

const require = createRequire(import.meta.url);

let mode = 'unknown';
let initialized = false;

function resolveElectronApp(providedApp) {
  if (providedApp) {
    return providedApp;
  }

  try {
    const electronModule = require('electron');
    return electronModule?.app ?? electronModule;
  } catch {
    throw Errors.notInElectronMain();
  }
}

/**
 * Initialize sesy-guard. Call this at the very top of your Electron main.js,
 * before app.whenReady() and before any other code.
 * @param {object} [options={}]
 * @param {object} [options.app]
 * @param {boolean} [options.verbose=true]
 * @returns {'ssh' | 'local'}
 */
export function initSesyGuard(options = {}) {
  const { app: providedApp, verbose = true } = options;

  if (initialized) {
    log.warn('initSesyGuard() already called, skipping duplicate initialization.');
    return mode;
  }

  const sshMode = isHeadlessEnvironment();
  const reason = getDetectionReason();

  if (!sshMode) {
    mode = 'local';
    initialized = true;

    if (verbose) {
      log.info('Local mode — no changes applied.');
    }

    return mode;
  }

  const electronApp = resolveElectronApp(providedApp);

  if (typeof electronApp.isReady === 'function' && electronApp.isReady()) {
    const lateError = Errors.calledAfterAppReady();
    log.warn('initSesyGuard() was called after app.isReady().');
    log.warn('Flags cannot be injected at this point — call it earlier in main.js.');
    log.warn(`See: ${lateError.hint}`);
  }

  injectHeadlessFlags(electronApp);

  if (verbose) {
    log.info(`SSH mode detected${reason ? ` (${reason})` : ''}.`);
    log.success('Electron flags injected. Dev server will start — connect with sesy CLI.');
  }

  mode = 'ssh';
  initialized = true;
  return mode;
}

/**
 * Returns true if currently running in SSH/headless mode.
 * @returns {boolean}
 */
export function isSshMode() {
  return mode === 'ssh';
}

/**
 * Returns the current mode string.
 * @returns {'ssh' | 'local' | 'unknown'}
 */
export function getMode() {
  return mode;
}

/**
 * Wrap app.whenReady and skip the callback in SSH mode.
 * @param {() => unknown | Promise<unknown>} [callback]
 * @param {object} [options={}]
 * @param {object} [options.app]
 * @returns {Promise<unknown>}
 */
export function whenReady(callback, options = {}) {
  try {
    const electronApp = resolveElectronApp(options.app);

    return electronApp.whenReady().then(async () => {
      if (isSshMode()) {
        log.info('SSH mode active — skipping BrowserWindow creation.');
        return undefined;
      }

      if (typeof callback === 'function') {
        return callback();
      }

      return undefined;
    });
  } catch (error) {
    if (error instanceof SesyGuardError) {
      throw error;
    }

    throw Errors.notInElectronMain();
  }
}
