/**
 * sesy — config.test.js
 * Covers config loading, validation, and default-file creation behavior.
 */

import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { createDefaultConfig, loadConfig, validateConfig } from '../src/core/config.js';
import { SesyError } from '../src/utils/errors.js';

describe('config helpers', () => {
  test('loadConfig reads a valid .sesy.json', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sesy-config-'));
    const { path: configPath } = await createDefaultConfig({
      configPath: path.join(tempDir, '.sesy.json'),
      port: 4567,
    });

    const config = await loadConfig(configPath);
    expect(config.port).toBe(4567);
    expect(config.framework).toBe('electron');
  });

  test('loadConfig throws SesyError when file is missing', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sesy-config-'));
    const missingPath = path.join(tempDir, '.sesy.json');
    await expect(loadConfig(missingPath)).rejects.toBeInstanceOf(SesyError);
  });

  test('validateConfig throws on invalid framework value', () => {
    expect(() => validateConfig({ framework: 'tauri' })).toThrow(SesyError);
  });

  test('validateConfig throws on non-numeric port', () => {
    expect(() => validateConfig({ port: '3000' })).toThrow(SesyError);
  });

  test('createDefaultConfig writes correct default fields', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sesy-config-'));
    const targetPath = path.join(tempDir, '.sesy.json');

    await createDefaultConfig({ configPath: targetPath });
    const raw = await readFile(targetPath, 'utf8');
    const parsed = JSON.parse(raw);

    expect(parsed).toMatchObject({
      port: 8000,
      framework: 'electron',
      windowWidth: 1280,
      windowHeight: 800,
      pollIntervalMs: 500,
      pollTimeoutMs: 60000,
      electronArgs: [],
      env: {},
    });
  });
});
