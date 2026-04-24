/**
 * sesy-guard — injector.js
 * Inject Electron command-line flags to suppress display/GPU in headless mode.
 */

import { Errors } from './errors.js';
import { log } from './logger.js';

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

function validateApp(electronApp) {
  if (!electronApp || typeof electronApp !== 'object') {
    throw Errors.invalidAppObject();
  }

  if (typeof electronApp.commandLine?.appendSwitch !== 'function') {
    throw Errors.invalidAppObject();
  }
}

/**
 * Returns the list of flags that were or would be injected.
 * @returns {Array<[string, string]>}
 */
export function getHeadlessFlags() {
  return HEADLESS_FLAGS.map(([flag, value]) => [flag, value]);
}

/**
 * Inject all required Electron command-line flags to suppress
 * display and GPU initialization in headless environments.
 * Must be called before app.whenReady().
 * @param {object} electronApp
 * @returns {void}
 */
export function injectHeadlessFlags(electronApp) {
  validateApp(electronApp);

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
