/**
 * sesy — logger.js
 * Chalk-based logger that keeps all CLI output consistent and readable.
 */

import process from 'node:process';
import { Chalk } from 'chalk';
import { DEFAULTS } from '../constants.js';

let hasPrintedBanner = false;

function shouldUseColor(stream) {
  return Boolean(stream.isTTY) && !process.env.NO_COLOR;
}

function getChalk(stream) {
  return new Chalk({ level: shouldUseColor(stream) ? 3 : 0 });
}

function formatMessage(args) {
  return args
    .map((value) => {
      if (value === null || value === undefined) {
        return '';
      }

      if (typeof value === 'string') {
        return value;
      }

      if (value instanceof Error) {
        return value.message;
      }

      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .filter(Boolean)
    .join(' ');
}

function write(stream, prefix, colorName, args) {
  const chalk = getChalk(stream);
  const message = formatMessage(args);
  const color = chalk[colorName];
  const text = prefix ? `${color(prefix)}${message ? ` ${message}` : ''}` : message;
  stream.write(`${text}\n`);
}

/**
 * Log an informational message.
 * @param {...unknown} args
 * @returns {void}
 */
function info(...args) {
  write(process.stdout, DEFAULTS.LOG_PREFIX, 'cyan', args);
}

/**
 * Log a success message.
 * @param {...unknown} args
 * @returns {void}
 */
function success(...args) {
  write(process.stdout, '✔', 'green', args);
}

/**
 * Log a warning message.
 * @param {...unknown} args
 * @returns {void}
 */
function warn(...args) {
  write(process.stdout, '⚠', 'yellow', args);
}

/**
 * Log an error message.
 * @param {...unknown} args
 * @returns {void}
 */
function error(...args) {
  write(process.stderr, '✖', 'red', args);
}

/**
 * Log a debug message when SESY_DEBUG=1.
 * @param {...unknown} args
 * @returns {void}
 */
function debug(...args) {
  if (process.env.SESY_DEBUG !== '1') {
    return;
  }

  write(process.stdout, '›', 'gray', args);
}

/**
 * Print a blank line.
 * @returns {void}
 */
function blank() {
  process.stdout.write('\n');
}

/**
 * Print the sesy banner once per process.
 * @returns {void}
 */
function banner() {
  if (hasPrintedBanner) {
    return;
  }

  const chalk = getChalk(process.stdout);

  process.stdout.write(
    `${chalk.cyan('  ███████╗███████╗███████╗██╗   ██╗')}\n` +
    `${chalk.cyan('  ██╔════╝██╔════╝██╔════╝╚██╗ ██╔╝')}\n` +
    `${chalk.cyan('  ███████╗█████╗  ███████╗ ╚████╔╝ ')}\n` +
    `${chalk.cyan('  ╚════██║██╔══╝  ╚════██║  ╚██╔╝  ')}\n` +
    `${chalk.cyan('  ███████║███████╗███████║   ██║   ')}\n` +
    `${chalk.cyan('  ╚══════╝╚══════╝╚══════╝   ╚═╝   ')}\n\n` +
    `${chalk.white('  SSH → Electron, instantly.')}\n\n`,
  );

  hasPrintedBanner = true;
}

export const log = {
  info,
  success,
  warn,
  error,
  debug,
  blank,
  banner,
};
