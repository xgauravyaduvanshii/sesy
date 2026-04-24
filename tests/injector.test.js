/**
 * sesy-guard — injector.test.js
 * Tests Electron flag injection behavior with a mock app object.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

async function loadInjector() {
  return import(`../src/injector.js?ts=${Date.now()}-${Math.random()}`);
}

beforeEach(() => {
  delete process.env.SESY_DEBUG;
});

describe('injector', () => {
  test('injectHeadlessFlags applies every flag to the mock app', async () => {
    const { getHeadlessFlags, injectHeadlessFlags } = await loadInjector();
    const mockApp = {
      commandLine: { appendSwitch: jest.fn() },
      isReady: () => false,
    };

    injectHeadlessFlags(mockApp);

    expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledTimes(getHeadlessFlags().length);
    for (const [flag, value] of getHeadlessFlags()) {
      expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledWith(flag, value);
    }
  });

  test('injectHeadlessFlags throws on null app', async () => {
    const { injectHeadlessFlags } = await loadInjector();
    expect(() => injectHeadlessFlags(null)).toThrow('The provided app object does not look like an Electron app instance.');
  });

  test('injectHeadlessFlags throws on plain object without commandLine', async () => {
    const { injectHeadlessFlags } = await loadInjector();
    expect(() => injectHeadlessFlags({})).toThrow('The provided app object does not look like an Electron app instance.');
  });

  test('getHeadlessFlags returns the correct list', async () => {
    const { getHeadlessFlags } = await loadInjector();
    const flags = getHeadlessFlags();
    expect(Array.isArray(flags)).toBe(true);
    expect(flags).toHaveLength(11);
    expect(flags[0]).toEqual(['no-sandbox', '']);
  });

  test('debug logging occurs when SESY_DEBUG=1', async () => {
    process.env.SESY_DEBUG = '1';
    const stdoutWrites = [];
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      stdoutWrites.push(String(chunk));
      return true;
    };

    try {
      const { injectHeadlessFlags } = await loadInjector();
      const mockApp = {
        commandLine: { appendSwitch: jest.fn() },
        isReady: () => false,
      };

      injectHeadlessFlags(mockApp);
      expect(stdoutWrites.join('')).toContain('Injected flag: --no-sandbox');
    } finally {
      process.stdout.write = originalStdoutWrite;
    }
  });
});
