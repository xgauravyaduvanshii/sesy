/**
 * sesy — config.js
 * Loads, validates, and creates project configuration files for sesy.
 */

import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { DEFAULTS, SUPPORTED_FRAMEWORKS } from '../constants.js';
import { Errors, SesyError } from '../utils/errors.js';

function getConfigPath(configPath = null) {
  return configPath
    ? path.resolve(configPath)
    : path.resolve(process.cwd(), DEFAULTS.CONFIG_FILENAME);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateNumber(field, value, minimum = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw Errors.configInvalid(field, 'must be a number');
  }

  if (!Number.isInteger(value)) {
    throw Errors.configInvalid(field, 'must be an integer');
  }

  if (value < minimum) {
    throw Errors.configInvalid(field, `must be >= ${minimum}`);
  }
}

/**
 * Validate a config object and merge it with defaults.
 * @param {Record<string, unknown>} config
 * @returns {object}
 */
export function validateConfig(config) {
  if (!isPlainObject(config)) {
    throw Errors.configInvalid('root', 'must be a JSON object');
  }

  if (config.port !== undefined) {
    validateNumber('port', config.port);
  }

  if (config.framework !== undefined) {
    if (typeof config.framework !== 'string') {
      throw Errors.configInvalid('framework', 'must be a string');
    }

    if (!SUPPORTED_FRAMEWORKS.includes(config.framework)) {
      throw Errors.configInvalid('framework', `must be one of: ${SUPPORTED_FRAMEWORKS.join(', ')}`);
    }
  }

  if (config.windowWidth !== undefined) {
    validateNumber('windowWidth', config.windowWidth);
  }

  if (config.windowHeight !== undefined) {
    validateNumber('windowHeight', config.windowHeight);
  }

  if (config.pollIntervalMs !== undefined) {
    validateNumber('pollIntervalMs', config.pollIntervalMs, 10);
  }

  if (config.pollTimeoutMs !== undefined) {
    validateNumber('pollTimeoutMs', config.pollTimeoutMs, 10);
  }

  if (config.electronArgs !== undefined) {
    if (!Array.isArray(config.electronArgs) || !config.electronArgs.every((item) => typeof item === 'string')) {
      throw Errors.configInvalid('electronArgs', 'must be an array of strings');
    }
  }

  if (config.env !== undefined && !isPlainObject(config.env)) {
    throw Errors.configInvalid('env', 'must be an object of key/value pairs');
  }

  return {
    port: config.port ?? DEFAULTS.PORT,
    framework: config.framework ?? SUPPORTED_FRAMEWORKS[0],
    windowWidth: config.windowWidth ?? DEFAULTS.WINDOW_WIDTH,
    windowHeight: config.windowHeight ?? DEFAULTS.WINDOW_HEIGHT,
    pollIntervalMs: config.pollIntervalMs ?? DEFAULTS.POLL_INTERVAL_MS,
    pollTimeoutMs: config.pollTimeoutMs ?? DEFAULTS.POLL_TIMEOUT_MS,
    electronArgs: config.electronArgs ?? [],
    env: config.env ?? {},
  };
}

/**
 * Load .sesy.json from the current directory or a provided path.
 * @param {string | null} [configPath=null]
 * @returns {Promise<object>}
 */
export async function loadConfig(configPath = null) {
  const resolvedPath = getConfigPath(configPath);

  try {
    await access(resolvedPath);
  } catch {
    throw Errors.configNotFound(resolvedPath);
  }

  try {
    const raw = await readFile(resolvedPath, 'utf8');
    return validateConfig(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SesyError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw Errors.configInvalid('file', `contains invalid JSON (${error.message})`);
    }

    throw new SesyError(
      `Could not load config at ${resolvedPath}: ${error.message}`,
      'Make sure the file is readable and valid JSON.',
    );
  }
}

/**
 * Create a default .sesy.json in the current directory.
 * @param {object} [options={}]
 * @returns {Promise<{ path: string, config: object }>}
 */
export async function createDefaultConfig(options = {}) {
  const resolvedPath = getConfigPath(options.configPath ?? null);

  try {
    const config = validateConfig({
      port: options.port ?? DEFAULTS.PORT,
      framework: options.framework ?? SUPPORTED_FRAMEWORKS[0],
      windowWidth: options.windowWidth ?? DEFAULTS.WINDOW_WIDTH,
      windowHeight: options.windowHeight ?? DEFAULTS.WINDOW_HEIGHT,
      pollIntervalMs: options.pollIntervalMs ?? DEFAULTS.POLL_INTERVAL_MS,
      pollTimeoutMs: options.pollTimeoutMs ?? DEFAULTS.POLL_TIMEOUT_MS,
      electronArgs: options.electronArgs ?? [],
      env: options.env ?? {},
    });

    await writeFile(resolvedPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    return { path: resolvedPath, config };
  } catch (error) {
    if (error instanceof SesyError) {
      throw error;
    }

    throw new SesyError(
      `Could not create config at ${resolvedPath}: ${error.message}`,
      'Check that the current directory is writable and try again.',
    );
  }
}
