# task.md — Sesy-Guard Build Tasks

## Project: sesy-guard
## Goal: npm package that prevents Electron from crashing in SSH/headless environments

---

## Folder structure to build

```
sesy-guard/
├── src/
│   ├── index.js              ← main export (initSesyGuard, isSshMode, whenReady)
│   ├── detector.js           ← SSH/headless environment detection
│   ├── injector.js           ← Electron flag injection
│   ├── logger.js             ← lightweight internal logger
│   └── errors.js             ← SesyGuardError class
├── docs/
│   ├── getting-started.md
│   ├── how-it-works.md
│   ├── api-reference.md
│   ├── integration-guide.md
│   ├── troubleshooting.md
│   └── advanced/
│       ├── vite-electron.md
│       ├── webpack-electron.md
│       └── electron-builder.md
├── tests/
│   ├── detector.test.js
│   ├── injector.test.js
│   └── index.test.js
├── package.json
└── README.md
```

---

## Phase 1 — Foundation

### Task 1.1 — package.json
**Status**: `[x]`

```json
{
  "name": "sesy-guard",
  "version": "0.1.0",
  "description": "Prevent Electron from crashing in SSH/headless environments. Part of the sesy toolkit.",
  "main": "./src/index.js",
  "exports": {
    ".": {
      "import": "./src/index.js",
      "require": "./src/index.cjs"
    }
  },
  "engines": { "node": ">=18" },
  "peerDependencies": { "electron": ">=20" },
  "peerDependenciesMeta": { "electron": { "optional": false } },
  "dependencies": {},
  "devDependencies": { "jest": "^29.0.0", "electron": "^30.0.0" },
  "keywords": ["electron", "ssh", "headless", "sesy", "no-display", "guard"],
  "license": "MIT",
  "files": ["src/", "docs/", "README.md"]
}
```

Note: zero runtime `dependencies` — only `devDependencies` and `peerDependencies`.

**Done when**: `npm install` succeeds, package structure valid.

---

### Task 1.2 — Logger (lightweight, no chalk dep)
**Status**: `[x]`

File: `src/logger.js`

Cannot use chalk (no runtime deps allowed). Use ANSI codes directly with a TTY check.

```js
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
};

function colorize(color, text) {
  if (!process.stdout.isTTY || process.env.NO_COLOR) return text;
  return COLORS[color] + text + COLORS.reset;
}
```

Export `log` with: `info`, `success`, `warn`, `error`, `debug` (gated on `SESY_DEBUG=1`).

All messages prefixed with `[sesy-guard]`.

**Done when**: `log.success('SSH mode active')` prints in green with prefix.

---

### Task 1.3 — Error class
**Status**: `[x]`

File: `src/errors.js`

```js
export class SesyGuardError extends Error {
  constructor(message, hint = null) {
    super(message);
    this.name = 'SesyGuardError';
    this.hint = hint;
  }
}
```

Pre-built errors:
- `Errors.notInElectronMain()` — called outside main process
- `Errors.calledAfterAppReady()` — initSesyGuard called too late
- `Errors.invalidMode(value)` — SESY_MODE env var has bad value

**Done when**: all factory functions return correct SesyGuardError instances.

---

## Phase 2 — Core engine

### Task 2.1 — SSH/headless detector
**Status**: `[x]`

File: `src/detector.js`

Must export:
```js
/**
 * Detect if the current environment is SSH or headless.
 * Returns true if Electron would crash without intervention.
 */
export function isHeadlessEnvironment()

/**
 * Return a string describing why SSH mode was detected.
 * Used for logging so developer understands what triggered it.
 * @returns {string|null} reason string or null if not headless
 */
export function getDetectionReason()

/**
 * Check if running on macOS (display detection differs on Mac)
 */
export function isMacOS()

/**
 * Check if SESY_MODE env var is set to override auto-detection
 * @returns {'ssh'|'local'|null}
 */
export function getModeOverride()
```

Detection logic (in priority order):
1. If `SESY_MODE=local` → return false (force local)
2. If `SESY_MODE=ssh` → return true (force SSH)
3. If `SSH_CLIENT` or `SSH_TTY` or `SSH_CONNECTION` env exists → return true
4. If macOS → return false (Mac has no DISPLAY but is not headless)
5. If no `DISPLAY` and no `WAYLAND_DISPLAY` → return true
6. If `CI=true` or `CONTINUOUS_INTEGRATION=true` → return true
7. Otherwise → return false

`getDetectionReason()` must return human-readable strings like:
- `"SSH_CLIENT env var detected"`
- `"No DISPLAY or WAYLAND_DISPLAY found"`
- `"SESY_MODE=ssh override active"`
- `"CI environment detected"`

**Done when**: detector correctly identifies SSH vs local in all scenarios listed above.

---

### Task 2.2 — Electron flag injector
**Status**: `[x]`

File: `src/injector.js`

Must export:
```js
/**
 * Inject all required Electron command-line flags to suppress
 * display/GPU initialization in headless environments.
 * Must be called before app.whenReady().
 * @param {object} electronApp - the electron `app` object
 */
export function injectHeadlessFlags(electronApp)

/**
 * Returns the list of flags that were/would be injected.
 * Useful for debugging.
 */
export function getHeadlessFlags()
```

Flags to inject (all required):
```js
const HEADLESS_FLAGS = [
  ['no-sandbox', ''],
  ['disable-gpu', ''],
  ['disable-software-rasterizer', ''],
  ['disable-dev-shm-usage', ''],
  ['headless', ''],
  ['disable-extensions', ''],
  ['disable-background-networking', ''],
  ['disable-default-apps', ''],
  ['disable-sync', ''],
  ['metrics-recording-only', ''],
  ['mute-audio', ''],
  ['no-first-run', ''],
];
```

`injectHeadlessFlags` must:
- Call `electronApp.commandLine.appendSwitch(flag, value)` for each flag
- Log each flag injection at debug level
- Throw `SesyGuardError` if `electronApp` is not the Electron app object
- Throw `SesyGuardError` if called after `app.isReady()` returns true (too late — flags must be set before ready)

**Done when**: injector applies all flags to a mock app object without error.

---

### Task 2.3 — Main module (public API)
**Status**: `[x]`

File: `src/index.js`

This is what users import. Must export:

```js
/**
 * Initialize sesy-guard. Call this at the very top of your Electron main.js,
 * before app.whenReady() and before any other code.
 *
 * In SSH/headless mode: injects Electron flags to prevent crash.
 * In local mode: complete no-op — your app runs exactly as before.
 *
 * @param {object} [options]
 * @param {object} [options.app] - Electron app object. Auto-imported if not provided.
 * @param {boolean} [options.verbose] - Print detection info to terminal
 * @returns {'ssh'|'local'} the detected mode
 */
export function initSesyGuard(options = {})

/**
 * Returns true if currently running in SSH/headless mode.
 * Can be called anywhere after initSesyGuard().
 */
export function isSshMode()

/**
 * Returns the current mode string.
 * @returns {'ssh'|'local'|'unknown'} — 'unknown' if initSesyGuard not called yet
 */
export function getMode()
```

`initSesyGuard` internal flow:
```
1. Check if already called → warn and return (idempotent)
2. Detect environment via detector.js
3. Log: "[sesy-guard] SSH mode detected — {reason}" or "[sesy-guard] Local mode — no changes"
4. If SSH mode:
   a. Import electron `app` (or use provided options.app)
   b. Call injectHeadlessFlags(app)
   c. Log all injected flags at debug level
   d. Print: "✔ SSH mode active. Start your renderer dev server. sesy CLI will connect."
5. Store mode in module-level variable
6. Return mode string
```

**Done when**: calling `initSesyGuard()` in a test environment with SSH env vars returns `'ssh'` and would have injected flags.

---

## Phase 3 — Integration helper (bonus)

### Task 3.1 — Auto-detect and warn if called too late
**Status**: `[x]`

In `initSesyGuard`, detect if user called it after `app.whenReady()` has already fired:

```js
if (electronApp.isReady()) {
  log.warn('initSesyGuard() was called after app.isReady().');
  log.warn('Flags cannot be injected at this point — call it earlier in main.js.');
  log.warn('See: https://github.com/your-org/sesy/docs/troubleshooting.md#called-too-late');
}
```

This is a warn, not a throw — app should still work in local mode, just ineffective in SSH mode.

**Done when**: warning prints when called after ready.

---

## Phase 4 — Tests

### Task 4.1 — detector.test.js
**Status**: `[x]`

Tests:
1. Returns `true` when `SSH_CLIENT` env is set
2. Returns `true` when `SSH_TTY` env is set
3. Returns `false` on macOS regardless of DISPLAY
4. Returns `true` when no DISPLAY and not macOS
5. `SESY_MODE=local` forces false even with SSH_CLIENT
6. `SESY_MODE=ssh` forces true even without SSH_CLIENT
7. `getDetectionReason()` returns correct string for each trigger

---

### Task 4.2 — injector.test.js
**Status**: `[x]`

Tests (using a mock `app` object):
1. All flags in `HEADLESS_FLAGS` are applied to mock app
2. Throws if called with non-app object
3. `getHeadlessFlags()` returns the correct list
4. Debug log prints each flag when `SESY_DEBUG=1`

---

### Task 4.3 — index.test.js
**Status**: `[x]`

Tests:
1. `initSesyGuard()` returns `'ssh'` in SSH environment
2. `initSesyGuard()` returns `'local'` in local environment
3. `isSshMode()` returns correct boolean after init
4. `getMode()` returns `'unknown'` before init
5. Calling `initSesyGuard()` twice is idempotent (no error, no double injection)

---

## Phase 5 — Documentation

### Task 5.1 — docs/getting-started.md
**Status**: `[x]`

Must cover:
- What problem this solves (the SSH Electron crash in plain English)
- `npm install --save-dev sesy-guard`
- The 3-line integration into `main.js`
- How to verify it's working (run `SESY_DEBUG=1 npm run dev` on SSH)
- Link to `sesy` CLI (the companion tool that opens the window locally)

---

### Task 5.2 — docs/how-it-works.md
**Status**: `[x]`

Must cover:
- Why Electron crashes in SSH (no display, GPU init fails)
- What the fatal error looks like (exact error text)
- How flag injection prevents the crash
- What "SSH mode" does differently vs "local mode"
- Why BrowserWindow creation should be skipped (window would open on the server, not locally)
- How sesy-guard + sesy CLI work together as a complete solution

---

### Task 5.3 — docs/api-reference.md
**Status**: `[x]`

Full API docs:

For each exported function:
- Function signature
- Description
- Parameters table
- Return value
- When to call it
- Example code
- Common mistakes

Functions to document: `initSesyGuard`, `isSshMode`, `getMode`.
Environment variables to document: `SESY_MODE`, `SESY_DEBUG`, `NO_COLOR`.

---

### Task 5.4 — docs/integration-guide.md
**Status**: `[x]`

Step-by-step guide for integrating into existing Electron projects.

Must show before/after code for these common patterns:

**Pattern 1 — Basic Electron main.js**
```js
// BEFORE
import { app, BrowserWindow } from 'electron';
app.whenReady().then(() => { createWindow(); });

// AFTER
import { app, BrowserWindow } from 'electron';
import { initSesyGuard, isSshMode } from 'sesy-guard';
const mode = initSesyGuard();
app.whenReady().then(() => {
  if (!isSshMode()) createWindow();
});
```

**Pattern 2 — Electron + Vite (electron-vite)**
Show how to integrate without breaking hot reload.

**Pattern 3 — Electron Forge**
Show integration with Forge's main process.

**Pattern 4 — TypeScript projects**
Show that types work (`initSesyGuard()` returns `'ssh' | 'local'`).

---

### Task 5.5 — docs/troubleshooting.md
**Status**: `[x]`

Sections:
- `initSesyGuard called too late` — move it higher in main.js
- `App still crashes in SSH` — check if SESY_MODE is being overridden
- `SSH mode detected on local machine` — set SESY_MODE=local
- `Renderer dev server not starting` — sesy-guard only handles the main process
- `Black window when connecting with sesy CLI` — renderer crashed, check terminal for errors
- `TypeScript: cannot find module 'sesy-guard'` — check tsconfig moduleResolution

---

### Task 5.6 — docs/advanced/vite-electron.md
**Status**: `[x]`

Complete guide for Vite + Electron setups (electron-vite, vite-plugin-electron).
Show that sesy-guard integrates in `electron/main.ts`, not in vite config.
Show how to check port used by Vite dev server to configure sesy CLI.

---

### Task 5.7 — docs/advanced/electron-builder.md
**Status**: `[x]`

Guide for using sesy-guard with electron-builder.
Explain: sesy-guard is a devDependency — it should NOT be bundled in production builds.
Show how electron-builder's `files` config should exclude sesy-guard from production.
Show a conditional import pattern so production builds work fine without the package.

---

## Phase 6 — Release prep

### Task 6.1 — README.md
**Status**: `[x]`

Sections:
1. Title + one-line description
2. "The problem" — 3 lines explaining the SSH crash
3. "The fix" — 3 lines explaining what sesy-guard does
4. Install
5. Quick integration (3 code lines)
6. API table (function | returns | description)
7. Environment variables table
8. "Part of the sesy toolkit" — link to sesy CLI
9. License: MIT

---

## Task tracker

| Task | Status | Files |
|---|---|---|
| 1.1 package.json | `[x]` | package.json |
| 1.2 Logger | `[x]` | src/logger.js |
| 1.3 Error class | `[x]` | src/errors.js |
| 2.1 Detector | `[x]` | src/detector.js |
| 2.2 Injector | `[x]` | src/injector.js |
| 2.3 Main API | `[x]` | src/index.js |
| 3.1 Late-call warning | `[x]` | src/index.js update |
| 4.1 Detector tests | `[x]` | tests/detector.test.js |
| 4.2 Injector tests | `[x]` | tests/injector.test.js |
| 4.3 Index tests | `[x]` | tests/index.test.js |
| 5.1 Getting started | `[x]` | docs/getting-started.md |
| 5.2 How it works | `[x]` | docs/how-it-works.md |
| 5.3 API reference | `[x]` | docs/api-reference.md |
| 5.4 Integration guide | `[x]` | docs/integration-guide.md |
| 5.5 Troubleshooting | `[x]` | docs/troubleshooting.md |
| 5.6 Vite+Electron | `[x]` | docs/advanced/vite-electron.md |
| 5.7 Electron Builder | `[x]` | docs/advanced/electron-builder.md |
| 6.1 README | `[x]` | README.md |
