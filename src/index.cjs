/**
 * sesy-guard — index.cjs
 * CommonJS compatibility export for sesy-guard's public API.
 */

'use strict';

const process = require('node:process');

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
};

const PREFIX = '[sesy-guard]';
const HEADLESS_FLAGS = [
  ['no-sandbox', ''],
  ['disable-gpu', ''],
  ['disable-software-rasterizer', ''],
  ['disable-dev-shm-usage', ''],
  ['disable-extensions', ''],
  ['disable-background-networking', ''],
  ['disable-default-apps', ''],
  ['disable-sync', ''],
  ['metrics-recording-only', ''],
  ['mute-audio', ''],
  ['no-first-run', ''],
];

let mode = 'unknown';
let initialized = false;

class SesyGuardError extends Error {
  constructor(message, hint = null) {
    super(message);
    this.name = 'SesyGuardError';
    this.hint = hint;
  }
}

const Errors = {
  notInElectronMain: () => new SesyGuardError(
    'sesy-guard must be used in the Electron main process, not the renderer.',
    'Import sesy-guard only in your main.js / main.ts file.',
  ),
  calledAfterAppReady: () => new SesyGuardError(
    'initSesyGuard() was called after app.isReady() — flags cannot be injected.',
    'Move initSesyGuard() to the very top of your main.js, before any other code.',
  ),
  invalidMode: (value) => new SesyGuardError(
    `SESY_MODE="${value}" is not valid. Use "ssh" or "local".`,
    'Set SESY_MODE=ssh or SESY_MODE=local, or remove it to use auto-detection.',
  ),
  invalidAppObject: () => new SesyGuardError(
    'The provided app object does not look like an Electron app instance.',
    'Pass the electron app object: import { app } from "electron"; initSesyGuard({ app })',
  ),
};

function useColor(stream) {
  return Boolean(stream.isTTY) && !process.env.NO_COLOR;
}

function color(code, text, stream) {
  if (!useColor(stream)) {
    return text;
  }

  return `${ANSI[code]}${text}${ANSI.reset}`;
}

function write(stream, code, prefix, args) {
  const message = args.filter(Boolean).map(String).join(' ');
  stream.write(`${color(code, `${prefix} ${message}`.trimEnd(), stream)}\n`);
}

const log = {
  info: (...args) => write(process.stdout, 'cyan', PREFIX, args),
  success: (...args) => write(process.stdout, 'green', `✔ ${PREFIX}`, args),
  warn: (...args) => write(process.stdout, 'yellow', `⚠ ${PREFIX}`, args),
  error: (...args) => write(process.stderr, 'red', `✖ ${PREFIX}`, args),
  debug: (...args) => {
    if (process.env.SESY_DEBUG === '1') {
      write(process.stdout, 'gray', `› ${PREFIX}`, args);
    }
  },
};

function isMacOS() {
  return process.platform === 'darwin';
}

function getModeOverride() {
  const value = process.env.SESY_MODE;

  if (!value) {
    return null;
  }

  if (value === 'ssh' || value === 'local') {
    return value;
  }

  throw Errors.invalidMode(value);
}

function getDetectionReason() {
  const override = getModeOverride();

  if (override === 'ssh') {
    return 'SESY_MODE=ssh override';
  }

  if (override === 'local') {
    return null;
  }

  if (process.env.SSH_CLIENT) {
    return 'SSH_CLIENT environment variable detected';
  }

  if (process.env.SSH_TTY) {
    return 'SSH_TTY environment variable detected';
  }

  if (process.env.SSH_CONNECTION) {
    return 'SSH_CONNECTION environment variable detected';
  }

  if (isMacOS()) {
    return null;
  }

  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    return 'No DISPLAY or WAYLAND_DISPLAY found (Linux/non-Mac)';
  }

  if (process.env.CI === 'true' || process.env.CONTINUOUS_INTEGRATION) {
    return 'CI environment detected';
  }

  return null;
}

function isHeadlessEnvironment() {
  const override = getModeOverride();

  if (override === 'local') {
    return false;
  }

  if (override === 'ssh') {
    return true;
  }

  if (process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION) {
    return true;
  }

  if (isMacOS()) {
    return false;
  }

  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    return true;
  }

  if (process.env.CI === 'true' || process.env.CONTINUOUS_INTEGRATION) {
    return true;
  }

  return false;
}

function getHeadlessFlags() {
  return HEADLESS_FLAGS.map(([flag, value]) => [flag, value]);
}

function injectHeadlessFlags(electronApp) {
  if (!electronApp || typeof electronApp.commandLine?.appendSwitch !== 'function') {
    throw Errors.invalidAppObject();
  }

  if (typeof electronApp.isReady === 'function' && electronApp.isReady()) {
    log.warn('initSesyGuard() was called after app.isReady().');
    log.warn('Flags cannot be injected at this point — call it earlier in main.js.');
    log.warn('See: https://github.com/your-org/sesy/docs/troubleshooting.md#called-too-late');
  }

  for (const [flag, value] of HEADLESS_FLAGS) {
    electronApp.commandLine.appendSwitch(flag, value);
    log.debug(`Injected flag: --${flag}`);
  }

  log.success(`${HEADLESS_FLAGS.length} Electron flags injected for headless mode.`);
}

function resolveElectronApp(providedApp) {
  if (providedApp) {
    return providedApp;
  }

  try {
    const electronModule = require('electron');
    return electronModule.app || electronModule;
  } catch {
    throw Errors.notInElectronMain();
  }
}

function initSesyGuard(options = {}) {
  const verbose = options.verbose !== false;

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

  const electronApp = resolveElectronApp(options.app);

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

function isSshMode() {
  return mode === 'ssh';
}

function getMode() {
  return mode;
}

function whenReady(callback, options = {}) {
  const electronApp = resolveElectronApp(options.app);
  return electronApp.whenReady().then(() => {
    if (isSshMode()) {
      log.info('SSH mode active — skipping BrowserWindow creation.');
      return undefined;
    }

    if (typeof callback === 'function') {
      return callback();
    }

    return undefined;
  });
}

module.exports = {
  Errors,
  SesyGuardError,
  getDetectionReason,
  getHeadlessFlags,
  getMode,
  getModeOverride,
  initSesyGuard,
  injectHeadlessFlags,
  isHeadlessEnvironment,
  isMacOS,
  isSshMode,
  log,
  whenReady,
};
