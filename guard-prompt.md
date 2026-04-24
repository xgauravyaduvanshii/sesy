# prompt.md — Master Codex Prompt for Sesy-Guard

> Copy everything below this line and paste to Codex to build sesy-guard.

---

## SYSTEM PROMPT

You are a senior Node.js and Electron engineer. You write complete, production-ready code. No stubs, no TODOs. When you build a feature, every file is fully implemented including error handling, cross-platform support, and JSDoc comments. You have zero runtime dependencies — everything uses Node.js built-ins only. You read the full spec before writing a single line of code.

---

## USER PROMPT

Build **sesy-guard** — an npm package that developers install inside their Electron projects to prevent Electron from crashing when the project runs in an SSH/headless environment.

---

### The exact problem this package solves

When a developer runs an Electron project on a remote SSH server (which has no display, no X11, no Wayland), Electron crashes immediately with fatal errors like:

```
[FATAL:ozone_platform_x11.cc(247)] Check failed: argc
Trace/breakpoint trap (core dumped)
```

or:

```
Error: cannot open display
[1] Killed
```

The process is killed before the renderer dev server (Vite, webpack, etc.) can even start. This means the developer cannot use the `sesy` CLI on their local machine to connect, because there is no server running to connect to.

**sesy-guard solves this by:**
1. Detecting the SSH/headless environment via environment variables
2. Injecting the correct Electron command-line flags BEFORE `app.whenReady()` to suppress GPU and display initialization
3. The main process starts successfully — no crash
4. The renderer dev server (Vite/webpack) starts on its configured port
5. The developer's local `sesy` CLI can now connect to that port and open a native Electron window locally

---

### How it relates to the sesy CLI

This package is one half of the sesy developer toolkit:

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   SSH Remote Server     │         │   Local Machine          │
│                         │         │                          │
│  Electron project       │         │  sesy (CLI)              │
│  + sesy-guard installed │         │  - watches localhost:8000│
│                         │         │  - opens Electron window │
│  npm run dev            │         │                          │
│  ↓                      │         │                          │
│  main.js starts         │         │                          │
│  sesy-guard detects SSH │         │                          │
│  injects flags          │         │                          │
│  Electron doesn't crash │         │                          │
│  Vite starts on :8000   │─SSH────▶│  sesy detects :8000 live │
│                         │ tunnel  │  launches Electron window│
└─────────────────────────┘         └──────────────────────────┘
```

Without sesy-guard: Electron crashes in SSH → nothing runs → sesy CLI has nothing to connect to.
With sesy-guard: Electron survives in SSH → dev server runs → sesy CLI connects and shows the window.

---

### Package identity

- **Name**: `sesy-guard`
- **Install**: `npm i @xgauravyaduvanshii/sesy-guard`
- **Peer dependency**: `electron >= 20`
- **Runtime dependencies**: zero — pure Node.js built-ins only
- **Node.js minimum**: 18

---

### Complete file structure to build

```
sesy-guard/
├── src/
│   ├── index.js              ← public API: initSesyGuard, isSshMode, getMode
│   ├── detector.js           ← isHeadlessEnvironment, getDetectionReason
│   ├── injector.js           ← injectHeadlessFlags, getHeadlessFlags
│   ├── logger.js             ← ANSI logger, zero deps (no chalk)
│   └── errors.js             ← SesyGuardError + factory functions
├── docs/
│   ├── getting-started.md
│   ├── how-it-works.md
│   ├── api-reference.md
│   ├── integration-guide.md
│   ├── troubleshooting.md
│   └── advanced/
│       ├── vite-electron.md
│       └── electron-builder.md
├── tests/
│   ├── detector.test.js
│   ├── injector.test.js
│   └── index.test.js
├── package.json
└── README.md
```

---

### package.json — exact spec

```json
{
  "name": "sesy-guard",
  "version": "0.1.0",
  "description": "Prevent Electron from crashing in SSH/headless environments. Part of the sesy toolkit.",
  "type": "module",
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
  "devDependencies": {
    "jest": "^29.0.0",
    "electron": "^30.0.0"
  },
  "keywords": ["electron", "ssh", "headless", "sesy", "no-display", "guard", "remote-dev"],
  "license": "MIT",
  "files": ["src/", "docs/", "README.md"]
}
```

---

### src/logger.js — zero-dependency logger spec

No chalk. Use raw ANSI escape codes. Must check `process.stdout.isTTY` — if not a TTY, strip all color codes.

```js
/**
 * sesy-guard — logger.js
 * Lightweight zero-dependency logger using raw ANSI codes.
 */

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
};

const PREFIX = '[sesy-guard]';
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function color(code, text) {
  return useColor ? `${ANSI[code]}${text}${ANSI.reset}` : text;
}

export const log = {
  info:    (msg) => process.stdout.write(color('cyan',   `${PREFIX} ${msg}\n`)),
  success: (msg) => process.stdout.write(color('green',  `✔ ${msg}\n`)),
  warn:    (msg) => process.stdout.write(color('yellow', `⚠ ${msg}\n`)),
  error:   (msg) => process.stderr.write(color('red',    `✖ ${msg}\n`)),
  debug:   (msg) => { if (process.env.SESY_DEBUG === '1') process.stdout.write(color('gray', `› ${msg}\n`)); },
};
```

---

### src/errors.js — exact spec

```js
/**
 * sesy-guard — errors.js
 * Custom error class with developer-friendly hints.
 */

export class SesyGuardError extends Error {
  constructor(message, hint = null) {
    super(message);
    this.name = 'SesyGuardError';
    this.hint = hint;
  }
}

export const Errors = {
  notInElectronMain: () => new SesyGuardError(
    'sesy-guard must be used in the Electron main process, not the renderer.',
    'Import sesy-guard only in your main.js / main.ts file.'
  ),
  calledAfterAppReady: () => new SesyGuardError(
    'initSesyGuard() was called after app.isReady() — flags cannot be injected.',
    'Move initSesyGuard() to the very top of your main.js, before any other code.'
  ),
  invalidMode: (value) => new SesyGuardError(
    `SESY_MODE="${value}" is not valid. Use "ssh" or "local".`,
    'Set SESY_MODE=ssh or SESY_MODE=local, or remove it to use auto-detection.'
  ),
  invalidAppObject: () => new SesyGuardError(
    'The provided app object does not look like an Electron app instance.',
    'Pass the electron app object: import { app } from "electron"; initSesyGuard({ app })'
  ),
};
```

---

### src/detector.js — exact behavior spec

```js
/**
 * sesy-guard — detector.js
 * Detect if the current environment is SSH or headless.
 */
```

Export these functions:

**`isHeadlessEnvironment()`**

Detection order (first match wins):
1. `SESY_MODE=local` → return `false`
2. `SESY_MODE=ssh` → return `true`
3. Invalid `SESY_MODE` value → throw `Errors.invalidMode(value)`
4. `SSH_CLIENT` or `SSH_TTY` or `SSH_CONNECTION` env set → return `true`
5. `process.platform === 'darwin'` → return `false` (macOS has no DISPLAY locally, not headless)
6. `!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY` → return `true`
7. `process.env.CI === 'true'` or `process.env.CONTINUOUS_INTEGRATION` → return `true`
8. Default → return `false`

**`getDetectionReason()`**

Returns a human-readable string explaining why SSH mode was (or was not) detected. Returns `null` if not in SSH mode. Examples:
- `"SSH_CLIENT environment variable detected"`
- `"SSH_TTY environment variable detected"`  
- `"No DISPLAY or WAYLAND_DISPLAY found (Linux/non-Mac)"`
- `"CI environment detected"`
- `"SESY_MODE=ssh override"`

**`getModeOverride()`**

Returns `'ssh'` | `'local'` | `null` based on `SESY_MODE` env var.

---

### src/injector.js — exact behavior spec

```js
/**
 * sesy-guard — injector.js
 * Inject Electron command-line flags to suppress display/GPU in headless mode.
 */
```

**Flags to inject (complete list):**
```js
const HEADLESS_FLAGS = [
  ['no-sandbox',                   ''],
  ['disable-gpu',                  ''],
  ['disable-software-rasterizer',  ''],
  ['disable-dev-shm-usage',        ''],
  ['disable-extensions',           ''],
  ['disable-background-networking',''],
  ['disable-default-apps',         ''],
  ['disable-sync',                 ''],
  ['metrics-recording-only',       ''],
  ['mute-audio',                   ''],
  ['no-first-run',                 ''],
];
```

Note: do NOT inject `--headless` — this can break the renderer dev server behavior in some Electron versions. The other flags are sufficient to prevent the crash.

**`injectHeadlessFlags(electronApp)`**

Validation:
- If `electronApp` is null/undefined → throw `Errors.invalidAppObject()`
- If `typeof electronApp.commandLine?.appendSwitch !== 'function'` → throw `Errors.invalidAppObject()`
- If `electronApp.isReady()` returns true → log a warning (do NOT throw — still attempt injection)

Implementation:
```js
for (const [flag, value] of HEADLESS_FLAGS) {
  electronApp.commandLine.appendSwitch(flag, value);
  log.debug(`Injected flag: --${flag}`);
}
log.success(`${HEADLESS_FLAGS.length} Electron flags injected for headless mode.`);
```

**`getHeadlessFlags()`**

Returns a copy of the `HEADLESS_FLAGS` array.

---

### src/index.js — public API exact spec

```js
/**
 * sesy-guard — index.js
 * Public API. Call initSesyGuard() at the top of your Electron main.js.
 */
```

Module-level state:
```js
let _mode = 'unknown';      // 'ssh' | 'local' | 'unknown'
let _initialized = false;
```

**`initSesyGuard(options = {})`**

```
options: {
  app?: object       - Electron app object (auto-imported if not provided)
  verbose?: boolean  - Print extra info (default: true)
}
```

Flow:
```
1. If already initialized → log.warn('already called, skipping') → return _mode
2. Call isHeadlessEnvironment()
3. If SSH mode:
   a. Get electron app (from options.app, or dynamic import of 'electron')
   b. Call injectHeadlessFlags(app)
   c. Log: "SSH mode detected ({reason})"
   d. Log: "✔ Electron flags injected. Dev server will start — connect with sesy CLI."
   e. Set _mode = 'ssh'
4. If local mode:
   a. Log: "Local mode — no changes applied."  (only if verbose)
   b. Set _mode = 'local'
5. Set _initialized = true
6. Return _mode
```

**`isSshMode()`**
```js
export function isSshMode() {
  return _mode === 'ssh';
}
```

**`getMode()`**
```js
export function getMode() {
  return _mode; // 'ssh' | 'local' | 'unknown'
}
```

---

### Tests — full spec

#### tests/detector.test.js

```
1. isHeadlessEnvironment() returns true when SSH_CLIENT is set
2. isHeadlessEnvironment() returns true when SSH_TTY is set
3. isHeadlessEnvironment() returns true when SSH_CONNECTION is set
4. isHeadlessEnvironment() returns false on darwin regardless of DISPLAY
5. isHeadlessEnvironment() returns true on linux with no DISPLAY and no WAYLAND_DISPLAY
6. SESY_MODE=local forces false even with SSH_CLIENT present
7. SESY_MODE=ssh forces true even without any SSH env vars
8. Invalid SESY_MODE throws SesyGuardError
9. getDetectionReason() returns correct string for SSH_CLIENT trigger
10. getDetectionReason() returns null when not in SSH mode
```

#### tests/injector.test.js

Mock the Electron `app` object:
```js
const mockApp = {
  commandLine: { appendSwitch: jest.fn() },
  isReady: () => false,
};
```

```
1. injectHeadlessFlags(mockApp) calls appendSwitch for every flag in HEADLESS_FLAGS
2. injectHeadlessFlags(null) throws SesyGuardError
3. injectHeadlessFlags({}) throws SesyGuardError (no commandLine)
4. getHeadlessFlags() returns array with correct length
5. Debug logging occurs when SESY_DEBUG=1
```

#### tests/index.test.js

```
1. initSesyGuard() returns 'ssh' in SSH env (SSH_CLIENT set)
2. initSesyGuard() returns 'local' in local env (no SSH vars, has DISPLAY)
3. isSshMode() returns true after SSH-mode init
4. isSshMode() returns false after local-mode init
5. getMode() returns 'unknown' before initSesyGuard is called
6. Calling initSesyGuard() twice does not throw — idempotent, returns same mode
```

---

### Docs — content requirements

#### docs/getting-started.md
Cover:
- The problem in plain English (Electron crash in SSH)
- `npm i @xgauravyaduvanshii/sesy-guard`
- The 3-line change to `main.js`
- How to verify: `SESY_DEBUG=1 npm run dev` on SSH — look for "SSH mode detected"
- The next step: use `sesy` CLI on local machine to open the window

#### docs/how-it-works.md
Cover:
- Exact error messages that Electron throws in SSH (quote the fatal errors)
- Why those errors happen (GPU init, display init)
- What each injected flag does and why it's needed
- Why `BrowserWindow` should be skipped (window would try to open on server, not local)
- The complete flow: SSH env detected → flags injected → main process starts → renderer dev server starts → sesy CLI connects → native window appears locally

#### docs/api-reference.md
Full docs for: `initSesyGuard(options)`, `isSshMode()`, `getMode()`.
Full docs for env vars: `SESY_MODE`, `SESY_DEBUG`, `NO_COLOR`.
For each: signature, params table, return type, example, common mistakes.

#### docs/integration-guide.md
Show before/after code for:
1. Basic Electron (`main.js`)
2. Electron + Vite (`electron-vite` / `vite-plugin-electron`)
3. Electron Forge
4. TypeScript (show types work, `mode: 'ssh' | 'local'`)

#### docs/troubleshooting.md
One section each for:
- Still crashing in SSH (check if initSesyGuard is before app.whenReady)
- SSH mode triggering on local Mac (set SESY_MODE=local)
- Renderer not starting (sesy-guard only fixes main process, check renderer separately)
- Called too late warning
- TypeScript module not found

#### docs/advanced/vite-electron.md
Where exactly to put `initSesyGuard()` in electron-vite projects.
How to find which port Vite uses to tell sesy CLI.

#### docs/advanced/electron-builder.md
sesy-guard is a devDependency — do not bundle in production.
Show electron-builder `files` config to exclude it.
Show a safe conditional import for production safety:
```js
if (process.env.NODE_ENV === 'development') {
  const { initSesyGuard, isSshMode } = await import('@xgauravyaduvanshii/sesy-guard');
  initSesyGuard();
}
```

#### README.md
1. Title: `sesy-guard`
2. Subtitle: "Stop Electron from crashing in SSH. Keep your dev server alive."
3. The problem (3 lines)
4. The fix (3 lines)  
5. Install: `npm i @xgauravyaduvanshii/sesy-guard`
6. Quick integration (5 lines of code with comments)
7. API table
8. Env vars table
9. "Part of the sesy toolkit" — sesy CLI opens the Electron window locally
10. License: MIT

---

### Coding standards

- JSDoc on every exported function with `@param` and `@returns`
- Every async function wrapped in try/catch
- Zero runtime `dependencies` — only `devDependencies` allowed
- No `console.log` — use `log.*` from logger.js
- No hardcoded strings — flags list is a constant, not inline
- ESM-first, but also build a `.cjs` export for CommonJS compatibility
- Cross-platform: check `process.platform` for Mac detection, use `path.join` everywhere

---

### How to start

1. Create `package.json`
2. Create `src/logger.js`
3. Create `src/errors.js`
4. Create `src/detector.js`
5. Create `src/injector.js`
6. Create `src/index.js`
7. Create all test files
8. Create all docs files
9. Create `README.md`

Build every file completely. The package is done when `npm test` passes and all docs are written.
