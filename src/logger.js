/**
 * sesy-guard — logger.js
 * Lightweight zero-dependency logger using raw ANSI codes.
 */

import process from 'node:process';

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
};

const PREFIX = '[sesy-guard]';

function useColor(stream) {
  return Boolean(stream.isTTY) && !process.env.NO_COLOR;
}

function formatValue(value) {
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
}

function color(code, text, stream) {
  if (!useColor(stream)) {
    return text;
  }

  return `${ANSI[code]}${text}${ANSI.reset}`;
}

function buildMessage(args) {
  return args.map(formatValue).filter(Boolean).join(' ');
}

function write(stream, code, prefix, args) {
  const message = buildMessage(args);
  const text = `${prefix} ${message}`.trimEnd();
  stream.write(`${color(code, text, stream)}\n`);
}

/**
 * Write an informational log line.
 * @param {...unknown} args
 * @returns {void}
 */
function info(...args) {
  write(process.stdout, 'cyan', PREFIX, args);
}

/**
 * Write a success log line.
 * @param {...unknown} args
 * @returns {void}
 */
function success(...args) {
  write(process.stdout, 'green', `✔ ${PREFIX}`, args);
}

/**
 * Write a warning log line.
 * @param {...unknown} args
 * @returns {void}
 */
function warn(...args) {
  write(process.stdout, 'yellow', `⚠ ${PREFIX}`, args);
}

/**
 * Write an error log line.
 * @param {...unknown} args
 * @returns {void}
 */
function error(...args) {
  write(process.stderr, 'red', `✖ ${PREFIX}`, args);
}

/**
 * Write a debug log line when SESY_DEBUG=1.
 * @param {...unknown} args
 * @returns {void}
 */
function debug(...args) {
  if (process.env.SESY_DEBUG !== '1') {
    return;
  }

  write(process.stdout, 'gray', `› ${PREFIX}`, args);
}

export const log = {
  info,
  success,
  warn,
  error,
  debug,
};
