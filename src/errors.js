/**
 * sesy-guard — errors.js
 * Custom error class with developer-friendly hints.
 */

export class SesyGuardError extends Error {
  /**
   * Create a sesy-guard error instance.
   * @param {string} message
   * @param {string | null} [hint=null]
   */
  constructor(message, hint = null) {
    super(message);
    this.name = 'SesyGuardError';
    this.hint = hint;
  }
}

export const Errors = {
  /**
   * Build an error for renderer-process usage.
   * @returns {SesyGuardError}
   */
  notInElectronMain: () => new SesyGuardError(
    'sesy-guard must be used in the Electron main process, not the renderer.',
    'Import sesy-guard only in your main.js / main.ts file.',
  ),

  /**
   * Build an error for late initialization.
   * @returns {SesyGuardError}
   */
  calledAfterAppReady: () => new SesyGuardError(
    'initSesyGuard() was called after app.isReady() — flags cannot be injected.',
    'Move initSesyGuard() to the very top of your main.js, before any other code.',
  ),

  /**
   * Build an error for invalid SESY_MODE values.
   * @param {string} value
   * @returns {SesyGuardError}
   */
  invalidMode: (value) => new SesyGuardError(
    `SESY_MODE="${value}" is not valid. Use "ssh" or "local".`,
    'Set SESY_MODE=ssh or SESY_MODE=local, or remove it to use auto-detection.',
  ),

  /**
   * Build an error for invalid Electron app objects.
   * @returns {SesyGuardError}
   */
  invalidAppObject: () => new SesyGuardError(
    'The provided app object does not look like an Electron app instance.',
    'Pass the electron app object: import { app } from "electron"; initSesyGuard({ app })',
  ),
};
