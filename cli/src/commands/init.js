/**
 * sesy — init.js
 * Creates and optionally overwrites project configuration for sesy.
 */

import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { DEFAULTS } from '../constants.js';
import { createDefaultConfig } from '../core/config.js';
import { log } from '../utils/logger.js';

async function configExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function confirmOverwrite() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question('.sesy.json already exists. Overwrite it? (y/N) ');
    return ['y', 'yes'].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

/**
 * Run the `sesy init` command.
 * @param {object} options
 * @param {number} [options.port]
 * @param {boolean} [options.force]
 * @returns {Promise<void>}
 */
export async function runInitCommand(options = {}) {
  try {
    const configPath = path.resolve(process.cwd(), DEFAULTS.CONFIG_FILENAME);
    const exists = await configExists(configPath);

    if (exists && !options.force) {
      const overwrite = await confirmOverwrite();

      if (!overwrite) {
        log.warn('.sesy.json already exists.');
        log.info('Run with --force to overwrite.');
        return;
      }
    }

    log.info('Creating .sesy.json...');
    log.blank();
    await createDefaultConfig({ port: options.port });
    log.success('Created .sesy.json');
    log.blank();
    log.info('Next steps:');
    log.info('1. On your SSH server, run:     npm run dev');
    log.info('2. On this machine, run:        sesy watch');
    log.blank();
    log.info("Run 'sesy doctor' to verify your setup is ready.");
  } catch (error) {
    throw error;
  }
}
