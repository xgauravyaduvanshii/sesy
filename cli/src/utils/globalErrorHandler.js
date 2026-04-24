/**
 * sesy — globalErrorHandler.js
 * Registers top-level process handlers so CLI failures stay human-friendly.
 */

import process from 'node:process';
import { EXIT_CODES } from '../constants.js';
import { SesyError } from './errors.js';
import { log } from './logger.js';

let registered = false;

function handle(error) {
  if (error instanceof SesyError) {
    log.error(error.message);

    if (error.hint) {
      log.warn(`Hint: ${error.hint}`);
    }

    process.exit(EXIT_CODES.ERROR);
  }

  const err = error instanceof Error ? error : new Error(String(error));
  log.error(`Unexpected error: ${err.message}`);
  log.debug(err.stack);
  process.exit(EXIT_CODES.ERROR);
}

/**
 * Register global process error handlers once.
 * @returns {void}
 */
export function registerGlobalErrorHandlers() {
  if (registered) {
    return;
  }

  process.on('uncaughtException', handle);
  process.on('unhandledRejection', (reason) => handle(reason));
  registered = true;
}
