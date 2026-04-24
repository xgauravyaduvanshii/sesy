/**
 * sesy-guard — detector.js
 * Detect if the current environment is SSH or headless.
 */

import process from 'node:process';
import { Errors } from './errors.js';

function readEnvironment() {
  return process.env;
}

/**
 * Check if the current platform is macOS.
 * @returns {boolean}
 */
export function isMacOS() {
  return process.platform === 'darwin';
}

/**
 * Check if SESY_MODE is explicitly forcing a mode.
 * @returns {'ssh' | 'local' | null}
 */
export function getModeOverride() {
  const value = readEnvironment().SESY_MODE;

  if (!value) {
    return null;
  }

  if (value === 'ssh' || value === 'local') {
    return value;
  }

  throw Errors.invalidMode(value);
}

/**
 * Return a human-readable explanation for SSH/headless detection.
 * @returns {string | null}
 */
export function getDetectionReason() {
  const env = readEnvironment();
  const override = getModeOverride();

  if (override === 'ssh') {
    return 'SESY_MODE=ssh override';
  }

  if (override === 'local') {
    return null;
  }

  if (env.SSH_CLIENT) {
    return 'SSH_CLIENT environment variable detected';
  }

  if (env.SSH_TTY) {
    return 'SSH_TTY environment variable detected';
  }

  if (env.SSH_CONNECTION) {
    return 'SSH_CONNECTION environment variable detected';
  }

  if (isMacOS()) {
    return null;
  }

  if (!env.DISPLAY && !env.WAYLAND_DISPLAY) {
    return 'No DISPLAY or WAYLAND_DISPLAY found (Linux/non-Mac)';
  }

  if (env.CI === 'true' || Boolean(env.CONTINUOUS_INTEGRATION)) {
    return 'CI environment detected';
  }

  return null;
}

/**
 * Detect if the current environment is SSH or headless.
 * Returns true if Electron would crash without intervention.
 * @returns {boolean}
 */
export function isHeadlessEnvironment() {
  const override = getModeOverride();
  const env = readEnvironment();

  if (override === 'local') {
    return false;
  }

  if (override === 'ssh') {
    return true;
  }

  if (env.SSH_CLIENT || env.SSH_TTY || env.SSH_CONNECTION) {
    return true;
  }

  if (isMacOS()) {
    return false;
  }

  if (!env.DISPLAY && !env.WAYLAND_DISPLAY) {
    return true;
  }

  if (env.CI === 'true' || Boolean(env.CONTINUOUS_INTEGRATION)) {
    return true;
  }

  return false;
}
