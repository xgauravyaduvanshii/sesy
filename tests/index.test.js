/**
 * sesy-guard — index.test.js
 * Tests the public sesy-guard API and module-level mode state.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

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

async function loadIndex() {
  return import(`../src/index.js?ts=${Date.now()}-${Math.random()}`);
}

beforeEach(() => {
  resetEnvironment();
});

describe('index', () => {
  test('initSesyGuard returns ssh in SSH environment', async () => {
    process.env.SSH_CLIENT = 'client';
    const { initSesyGuard } = await loadIndex();
    const mockApp = {
      commandLine: { appendSwitch: jest.fn() },
      isReady: () => false,
      whenReady: () => Promise.resolve(),
    };

    expect(initSesyGuard({ app: mockApp, verbose: false })).toBe('ssh');
  });

  test('initSesyGuard returns local in local environment', async () => {
    process.env.DISPLAY = ':0';
    const { initSesyGuard } = await loadIndex();
    expect(initSesyGuard({ verbose: false })).toBe('local');
  });

  test('isSshMode returns true after SSH-mode init', async () => {
    process.env.SSH_TTY = '/dev/pts/1';
    const { initSesyGuard, isSshMode } = await loadIndex();
    const mockApp = {
      commandLine: { appendSwitch: jest.fn() },
      isReady: () => false,
      whenReady: () => Promise.resolve(),
    };

    initSesyGuard({ app: mockApp, verbose: false });
    expect(isSshMode()).toBe(true);
  });

  test('isSshMode returns false after local-mode init', async () => {
    process.env.DISPLAY = ':0';
    const { initSesyGuard, isSshMode } = await loadIndex();
    initSesyGuard({ verbose: false });
    expect(isSshMode()).toBe(false);
  });

  test('getMode returns unknown before initSesyGuard is called', async () => {
    const { getMode } = await loadIndex();
    expect(getMode()).toBe('unknown');
  });

  test('calling initSesyGuard twice is idempotent', async () => {
    process.env.SSH_CLIENT = 'client';
    const { initSesyGuard } = await loadIndex();
    const mockApp = {
      commandLine: { appendSwitch: jest.fn() },
      isReady: () => false,
      whenReady: () => Promise.resolve(),
    };

    const firstMode = initSesyGuard({ app: mockApp, verbose: false });
    const secondMode = initSesyGuard({ app: mockApp, verbose: false });

    expect(firstMode).toBe('ssh');
    expect(secondMode).toBe('ssh');
    expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledTimes(11);
  });
});
