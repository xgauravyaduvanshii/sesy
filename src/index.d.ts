/**
 * sesy-guard — index.d.ts
 * Type declarations for the public sesy-guard API.
 */

export type SesyMode = 'ssh' | 'local';
export type SesyModeState = SesyMode | 'unknown';

export interface SesyGuardInitOptions {
  app?: {
    commandLine?: {
      appendSwitch: (flag: string, value?: string) => void;
    };
    isReady?: () => boolean;
    whenReady?: () => Promise<unknown>;
  };
  verbose?: boolean;
}

/**
 * Initialize sesy-guard and return the detected mode.
 */
export function initSesyGuard(options?: SesyGuardInitOptions): SesyMode;

/**
 * Returns true when sesy-guard is running in SSH/headless mode.
 */
export function isSshMode(): boolean;

/**
 * Returns the current guard mode.
 */
export function getMode(): SesyModeState;

/**
 * Wrap app.whenReady and skip the callback in SSH mode.
 */
export function whenReady(
  callback?: () => unknown | Promise<unknown>,
  options?: SesyGuardInitOptions,
): Promise<unknown>;
