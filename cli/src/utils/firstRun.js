/**
 * sesy — firstRun.js
 * Shows the first-run banner and quickstart only once per machine.
 */

import { access, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULTS } from '../constants.js';
import { SesyError } from './errors.js';
import { log } from './logger.js';

function getFlagPath() {
  return path.resolve(os.homedir(), '.sesy', DEFAULTS.FIRST_RUN_FLAG);
}

/**
 * Print the first-run experience once and persist a flag file.
 * @returns {Promise<void>}
 */
export async function ensureFirstRunExperience() {
  const flagPath = getFlagPath();

  try {
    await access(flagPath);
    return;
  } catch {
    // Missing flag is expected on first run.
  }

  try {
    await mkdir(path.dirname(flagPath), { recursive: true });
    log.banner();
    log.info('Quick start:');
    log.info('1. Run `sesy init` in your project directory.');
    log.info('2. Start your remote dev server with `npm run dev`.');
    log.info('3. Run `sesy watch` locally once SSH port forwarding is active.');
    log.blank();
    await writeFile(flagPath, `${new Date().toISOString()}\n`, 'utf8');
  } catch (error) {
    throw new SesyError(
      `Could not finish sesy first-run setup: ${error.message}`,
      'Check that your home directory is writable and try again.',
    );
  }
}
