/**
 * sesy — logger.test.js
 * Ensures logger methods write to the expected streams and respect env toggles.
 */

import { afterEach, describe, expect, jest, test } from '@jest/globals';

function withStreamSpies(callback) {
  const stdoutWrites = [];
  const stderrWrites = [];
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = ((chunk) => {
    stdoutWrites.push(String(chunk));
    return true;
  });

  process.stderr.write = ((chunk) => {
    stderrWrites.push(String(chunk));
    return true;
  });

  return Promise.resolve(callback(stdoutWrites, stderrWrites)).finally(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });
}

describe('logger', () => {
  const originalDebug = process.env.SESY_DEBUG;
  const originalNoColor = process.env.NO_COLOR;

  afterEach(() => {
    if (originalDebug === undefined) {
      delete process.env.SESY_DEBUG;
    } else {
      process.env.SESY_DEBUG = originalDebug;
    }

    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }

    jest.resetModules();
  });

  test('log.info writes to stdout', async () => withStreamSpies(async (stdoutWrites) => {
    const { log } = await import('../src/utils/logger.js');
    log.info('hello');
    expect(stdoutWrites.join('')).toContain('hello');
  }));

  test('log.error writes to stderr', async () => withStreamSpies(async (stdoutWrites, stderrWrites) => {
    const { log } = await import('../src/utils/logger.js');
    log.error('boom');
    expect(stdoutWrites.join('')).not.toContain('boom');
    expect(stderrWrites.join('')).toContain('boom');
  }));

  test('log.debug is suppressed without SESY_DEBUG=1', async () => withStreamSpies(async (stdoutWrites) => {
    delete process.env.SESY_DEBUG;
    const { log } = await import('../src/utils/logger.js');
    log.debug('hidden');
    expect(stdoutWrites.join('')).not.toContain('hidden');
  }));

  test('log.debug prints with SESY_DEBUG=1', async () => withStreamSpies(async (stdoutWrites) => {
    process.env.SESY_DEBUG = '1';
    const { log } = await import('../src/utils/logger.js');
    log.debug('visible');
    expect(stdoutWrites.join('')).toContain('visible');
  }));

  test('no chalk color codes are written when NO_COLOR=1 and methods tolerate empty args', async () => withStreamSpies(async (stdoutWrites) => {
    process.env.NO_COLOR = '1';
    const { log } = await import('../src/utils/logger.js');
    log.info();
    log.success('plain');
    expect(stdoutWrites.join('')).toContain('plain');
    expect(/\u001b\[[0-9;]*m/u.test(stdoutWrites.join(''))).toBe(false);
  }));
});
