/**
 * sesy — constants.js
 * All default configuration values and magic strings in one place.
 */

export const DEFAULTS = {
  PORT: 8000,
  POLL_INTERVAL_MS: 500,
  POLL_TIMEOUT_MS: 60000,
  RETRY_DELAY_MS: 500,
  WINDOW_WIDTH: 1280,
  WINDOW_HEIGHT: 800,
  CONFIG_FILENAME: '.sesy.json',
  LOG_PREFIX: '[sesy]',
  TEMP_DIR_NAME: 'sesy',
  FIRST_RUN_FLAG: '.sesy-first-run-done',
};

export const SUPPORTED_FRAMEWORKS = ['electron'];

export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  CONFIG_NOT_FOUND: 2,
  PORT_TIMEOUT: 3,
  ELECTRON_NOT_FOUND: 4,
};
