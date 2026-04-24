/**
 * sesy-guard — detector.test.js
 * Tests SSH and headless environment detection rules.
 */

import { beforeEach, describe, expect, test } from '@jest/globals';

const ORIGINAL_ENV = { ...process.env };

function resetEnvironment() {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }

  Object.assign(process.env, ORIGINAL_ENV);
  delete process.env.SSH_CLIENT;
  delete process.env.SSH_TTY;
  delete process.env.SSH_CONNECTION;
  delete process.env.DISPLAY;
  delete process.env.WAYLAND_DISPLAY;
  delete process.env.CI;
  delete process.env.CONTINUOUS_INTEGRATION;
  delete process.env.SESY_MODE;
}

async function loadDetector() {
  return import(`../src/detector.js?ts=${Date.now()}-${Math.random()}`);
}

beforeEach(() => {
  resetEnvironment();
});

describe('detector', () => {
  test('returns true when SSH_CLIENT is set', async () => {
    process.env.SSH_CLIENT = '1.2.3.4';
    const { isHeadlessEnvironment } = await loadDetector();
    expect(isHeadlessEnvironment()).toBe(true);
  });

  test('returns true when SSH_TTY is set', async () => {
    process.env.SSH_TTY = '/dev/pts/0';
    const { isHeadlessEnvironment } = await loadDetector();
    expect(isHeadlessEnvironment()).toBe(true);
  });

  test('returns true when SSH_CONNECTION is set', async () => {
    process.env.SSH_CONNECTION = 'ssh-conn';
    const { isHeadlessEnvironment } = await loadDetector();
    expect(isHeadlessEnvironment()).toBe(true);
  });

  test('returns false on macOS regardless of DISPLAY state', async () => {
    const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    delete process.env.DISPLAY;
    delete process.env.WAYLAND_DISPLAY;

    try {
      const { isHeadlessEnvironment } = await loadDetector();
      expect(isHeadlessEnvironment()).toBe(false);
    } finally {
      Object.defineProperty(process, 'platform', platformDescriptor);
    }
  });

  test('returns true when no DISPLAY and not macOS', async () => {
    delete process.env.DISPLAY;
    delete process.env.WAYLAND_DISPLAY;
    const { isHeadlessEnvironment } = await loadDetector();
    expect(isHeadlessEnvironment()).toBe(true);
  });

  test('SESY_MODE=local forces false even with SSH_CLIENT present', async () => {
    process.env.SSH_CLIENT = '1.2.3.4';
    process.env.SESY_MODE = 'local';
    const { isHeadlessEnvironment } = await loadDetector();
    expect(isHeadlessEnvironment()).toBe(false);
  });

  test('SESY_MODE=ssh forces true without SSH env vars', async () => {
    process.env.DISPLAY = ':0';
    process.env.SESY_MODE = 'ssh';
    const { isHeadlessEnvironment } = await loadDetector();
    expect(isHeadlessEnvironment()).toBe(true);
  });

  test('invalid SESY_MODE throws SesyGuardError', async () => {
    process.env.SESY_MODE = 'weird';
    const { isHeadlessEnvironment } = await loadDetector();
    expect(() => isHeadlessEnvironment()).toThrow('SESY_MODE="weird" is not valid');
  });

  test('getDetectionReason returns correct string for SSH_CLIENT trigger', async () => {
    process.env.SSH_CLIENT = '1.2.3.4';
    const { getDetectionReason } = await loadDetector();
    expect(getDetectionReason()).toBe('SSH_CLIENT environment variable detected');
  });

  test('getDetectionReason returns null when not in SSH mode', async () => {
    process.env.DISPLAY = ':0';
    const { getDetectionReason } = await loadDetector();
    expect(getDetectionReason()).toBe(null);
  });
});
