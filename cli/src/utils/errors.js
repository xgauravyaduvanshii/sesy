/**
 * sesy — errors.js
 * Custom error class and pre-built error factories with developer-friendly hints.
 */

export class SesyError extends Error {
  /**
   * Create a human-friendly Sesy error.
   * @param {string} message
   * @param {string | null} [hint=null]
   */
  constructor(message, hint = null) {
    super(message);
    this.name = 'SesyError';
    this.hint = hint;
  }
}

export const Errors = {
  /**
   * Build a port-in-use error.
   * @param {number} port
   * @returns {SesyError}
   */
  portInUse: (port) => new SesyError(
    `Port ${port} is already in use on this machine.`,
    `Another process is using port ${port}. Run: lsof -i :${port} to find it.`,
  ),

  /**
   * Build a config-not-found error.
   * @param {string} filePath
   * @returns {SesyError}
   */
  configNotFound: (filePath) => new SesyError(
    `No .sesy.json found at: ${filePath}`,
    `Run 'sesy init' in your project directory to create one.`,
  ),

  /**
   * Build a config-invalid error.
   * @param {string} field
   * @param {string} reason
   * @returns {SesyError}
   */
  configInvalid: (field, reason) => new SesyError(
    `Invalid config field '${field}': ${reason}`,
    `Edit your .sesy.json and fix the '${field}' field.`,
  ),

  /**
   * Build an electron-not-found error.
   * @returns {SesyError}
   */
  electronNotFound: () => new SesyError(
    'Electron binary not found.',
    'Try reinstalling sesy: npm install -g sesy',
  ),

  /**
   * Build a port-timeout error.
   * @param {number} port
   * @param {number} timeoutMs
   * @returns {SesyError}
   */
  portTimeout: (port, timeoutMs) => new SesyError(
    `Timed out waiting for localhost:${port} after ${timeoutMs / 1000}s.`,
    'Make sure your SSH tunnel is active and your dev server is running on the remote machine.',
  ),
};
