# task.md — Sesy Build Tasks

## Project: sesy
## Goal: SSH Electron bridge CLI — remote dev server → local Electron window

---

## How to use this file

Work tasks in order. Do not skip tasks. Mark each task `[x]` when fully done (code + tests + docs). Each task block tells you exactly what files to create and what each must contain.

---

## Phase 1 — Project foundation

### Task 1.1 — Repository scaffold
**Status**: `[x]`

Create the full folder structure and configuration files.

Files to create:
- `package.json` — name: `sesy`, version: `0.1.0`, type: `module`, bin: `{ "sesy": "./bin/sesy.js" }`, dependencies: `electron`, `commander`, `chalk`. devDependencies: `jest`
- `.gitignore` — node_modules, dist, .sesy-cache, *.log
- `.eslintrc.json` — standard ESM rules
- `README.md` — project title, one-liner, install command, basic usage
- `bin/sesy.js` — shebang (`#!/usr/bin/env node`), import commander, placeholder for commands

**Done when**: `node bin/sesy.js --help` prints the sesy CLI help text.

---

### Task 1.2 — Constants and defaults
**Status**: `[x]`

File: `src/constants.js`

Must export:
```js
export const DEFAULTS = {
  PORT: 8000,
  POLL_INTERVAL_MS: 500,
  POLL_TIMEOUT_MS: 60000,       // how long to wait before giving up
  RETRY_DELAY_MS: 500,
  WINDOW_WIDTH: 1280,
  WINDOW_HEIGHT: 800,
  CONFIG_FILENAME: '.sesy.json',
  LOG_PREFIX: '[sesy]',
};
```

**Done when**: constants import correctly, all values documented with inline comments.

---

### Task 1.3 — Logger utility
**Status**: `[x]`

File: `src/utils/logger.js`

Must export a `log` object with these methods:
- `log.info(msg)` — cyan prefix `[sesy]`, white message
- `log.success(msg)` — green checkmark `✔`, green message  
- `log.warn(msg)` — yellow `⚠`, yellow message
- `log.error(msg)` — red `✖`, red message
- `log.debug(msg)` — gray, only prints when `SESY_DEBUG=1` env var is set
- `log.banner()` — prints the sesy ASCII art banner on first run

Use `chalk` for all colors. Must work without color when stdout is not a TTY (pipes, CI).

**Done when**: `log.success('it works')` prints `✔ it works` in green.

---

### Task 1.4 — Custom error class
**Status**: `[x]`

File: `src/utils/errors.js`

```js
export class SesyError extends Error {
  constructor(message, hint = null) {
    super(message);
    this.name = 'SesyError';
    this.hint = hint; // shown to user as "Hint: ..."
  }
}
```

Export these pre-built errors as factory functions:
- `Errors.portInUse(port)`
- `Errors.configNotFound(path)`
- `Errors.configInvalid(field, reason)`
- `Errors.electronNotFound()`
- `Errors.portTimeout(port, timeoutMs)`

Each must have a helpful `hint` string explaining how the developer can fix the problem.

**Done when**: all factory functions return SesyError instances with correct message + hint.

---

## Phase 2 — Core engine

### Task 2.1 — Config loader
**Status**: `[x]`

File: `src/core/config.js`

Must export:
```js
// Load .sesy.json from current directory or provided path
export async function loadConfig(configPath = null)

// Create a default .sesy.json in current directory
export async function createDefaultConfig(options = {})

// Validate a config object — throw SesyError if invalid
export function validateConfig(config)
```

`.sesy.json` schema to validate:
```json
{
  "port": 8000,
  "framework": "electron",
  "windowWidth": 1280,
  "windowHeight": 800,
  "pollIntervalMs": 500,
  "pollTimeoutMs": 60000,
  "electronArgs": [],
  "env": {}
}
```

All fields optional — merge with DEFAULTS. `framework` must be `"electron"` (only supported value for now — reserve others).

**Done when**: loadConfig reads and validates `.sesy.json`, throws descriptive SesyError on bad fields.

---

### Task 2.2 — Port watcher
**Status**: `[x]`

File: `src/core/watcher.js`

The watcher polls `http://localhost:{port}` every `pollIntervalMs` ms. When the port responds (any HTTP response, including 404), it calls the `onReady` callback. It stops polling after `pollTimeoutMs` ms and calls `onTimeout`.

Must export:
```js
/**
 * Start watching a port. Returns a stop function.
 * @param {object} options
 * @param {number} options.port
 * @param {number} options.pollIntervalMs
 * @param {number} options.pollTimeoutMs
 * @param {function} options.onReady - called when port responds
 * @param {function} options.onTimeout - called if timeout exceeded
 * @param {function} options.onRetry - called on each failed attempt (optional)
 * @returns {function} stop - call to cancel watching
 */
export function watchPort(options)
```

Implementation rules:
- Use native `http.get()` — no axios, no node-fetch
- Must not crash if port refuses connection (ECONNREFUSED is expected while waiting)
- Must handle ECONNRESET, ETIMEDOUT, and other network errors gracefully
- `onRetry` receives `{ attempt, elapsedMs }` for progress logging
- Returned `stop()` function must clear all timers cleanly

**Done when**: watcher detects when a test server starts on a port and calls onReady within 1 second.

---

### Task 2.3 — Electron launcher
**Status**: `[x]`

File: `src/core/launcher.js`

Spawns a local Electron process that opens a BrowserWindow loading the provided URL.

Must export:
```js
/**
 * Launch an Electron window loading the given URL.
 * @param {string} url - e.g. 'http://localhost:8000'
 * @param {object} options
 * @param {number} options.windowWidth
 * @param {number} options.windowHeight
 * @param {string[]} options.electronArgs - extra args to pass to electron
 * @param {object} options.env - extra env vars
 * @returns {ChildProcess}
 */
export async function launchElectron(url, options)
```

How it works:
1. Find Electron binary using `require('electron')` — it exports the binary path
2. Write a temporary `sesy-bridge-main.js` file to a temp directory
3. Spawn `electron sesy-bridge-main.js` with the URL as an env var

The temp `sesy-bridge-main.js` must:
- Create a `BrowserWindow` with correct width/height
- Call `win.loadURL(process.env.SESY_URL)`
- Handle `app.on('window-all-closed')` to quit
- Set `nodeIntegration: false`, `contextIsolation: true` (secure defaults)
- Set a proper window title: `"sesy — {hostname}:{port}"`

Cross-platform notes:
- On Windows, Electron binary is `electron.exe`
- Use `path.resolve` everywhere, never string concatenation for paths
- Temp files go to `os.tmpdir()/sesy/`

**Done when**: `launchElectron('http://localhost:3000', {})` opens a real Electron window.

---

## Phase 3 — CLI commands

### Task 3.1 — `sesy init` command
**Status**: `[x]`

File: `src/commands/init.js`

What it does:
- Checks if `.sesy.json` already exists in cwd
- If yes: ask user if they want to overwrite (use `readline` — no external prompts lib)
- If no: create `.sesy.json` with defaults
- Print success message with next steps

CLI signature:
```
sesy init [options]
  --port <number>    Dev server port (default: 8000)
  --force            Overwrite existing config without asking
```

Output on success:
```
✔ Created .sesy.json
  
  Next steps:
  1. Start your remote dev server:  npm run dev
  2. On your local machine, run:    sesy watch
```

**Done when**: `sesy init` creates a valid `.sesy.json` with correct defaults.

---

### Task 3.2 — `sesy watch` command
**Status**: `[x]`

File: `src/commands/watch.js`

This is the main command. Full flow:

1. Load config from `.sesy.json` (or use CLI flag defaults)
2. Print banner + "Watching localhost:{port}..."
3. Show a spinner/progress with elapsed time while waiting
4. When port responds: print success, launch Electron
5. Keep process alive — Ctrl+C kills both the CLI and the Electron window
6. If Electron closes: optionally re-watch (with `--keep-watching` flag)

CLI signature:
```
sesy watch [options]
  --port <number>          Port to watch (overrides config)
  --width <number>         Window width
  --height <number>        Window height
  --timeout <number>       Seconds to wait before giving up (default: 60)
  --keep-watching          Re-launch Electron if window is closed
  --no-color               Disable colored output
```

Progress display while waiting (update in-place using `\r`):
```
⏳ Waiting for localhost:8000 ... (12s elapsed)
```

Success display:
```
✔ Port 8000 is live!
⚡ Launching Electron window...
✔ Done! Your app is running.

  Press Ctrl+C to stop.
```

Handle `SIGINT` (Ctrl+C): kill child Electron process, print "Goodbye.", exit 0.

**Done when**: full watch flow works end-to-end — wait → detect → launch → cleanup on exit.

---

### Task 3.3 — `sesy status` command
**Status**: `[x]`

File: `src/commands/status.js`

Diagnostic command. Checks and prints:
- Current `.sesy.json` config (or "no config found")
- Is the watched port currently reachable? (yes/no)
- Electron binary path (found / not found)
- sesy version
- Node.js version
- OS + platform

Output format:
```
sesy status

  Config          .sesy.json ✔
  Port            8000 — not reachable
  Electron        /usr/local/lib/node_modules/sesy/node_modules/electron/dist/electron ✔
  sesy version    0.1.0
  Node.js         v20.11.0
  Platform        linux x64
```

**Done when**: `sesy status` prints accurate diagnostics.

---

### Task 3.4 — `sesy doctor` command
**Status**: `[x]`

File: `src/commands/doctor.js`

Runs a series of checks and tells the user what to fix:

Checks:
1. Node.js >= 18 installed
2. `sesy` itself is correctly installed globally
3. Electron binary accessible
4. `.sesy.json` present and valid
5. Configured port is not currently blocked by firewall (basic TCP check)

For each check print:
```
  ✔  Node.js >= 18         v20.11.0
  ✔  Electron binary       found at /path/...
  ✖  .sesy.json            not found in current directory
     Hint: Run 'sesy init' to create one
```

Exit code: 0 if all pass, 1 if any fail.

**Done when**: `sesy doctor` catches a missing config and prints the hint.

---

## Phase 4 — Polish and DX

### Task 4.1 — Global error handler
**Status**: `[x]`

File: `src/utils/globalErrorHandler.js`

In `bin/sesy.js`, wrap all command execution in a top-level handler:

```js
process.on('uncaughtException', (err) => {
  if (err instanceof SesyError) {
    log.error(err.message);
    if (err.hint) log.warn(`Hint: ${err.hint}`);
  } else {
    log.error('Unexpected error: ' + err.message);
    log.debug(err.stack);
  }
  process.exit(1);
});
```

Also handle `unhandledRejection` the same way.

**Done when**: an unhandled SesyError prints cleanly without a stack trace (unless SESY_DEBUG=1).

---

### Task 4.2 — First-run experience
**Status**: `[x]`

When user runs `sesy` for the first time (detect via a flag file in home dir):
- Print the sesy banner in color
- Print 3-line quickstart guide
- Store `~/.sesy/first-run-done` so it doesn't repeat

Banner:
```
  ███████╗███████╗███████╗██╗   ██╗
  ██╔════╝██╔════╝██╔════╝╚██╗ ██╔╝
  ███████╗█████╗  ███████╗ ╚████╔╝ 
  ╚════██║██╔══╝  ╚════██║  ╚██╔╝  
  ███████║███████╗███████║   ██║   
  ╚══════╝╚══════╝╚══════╝   ╚═╝   
  
  SSH → Electron, instantly.
```

**Done when**: first run shows banner, second run does not.

---

## Phase 5 — Tests

### Task 5.1 — Unit tests: watcher
**Status**: `[x]`

File: `tests/watcher.test.js`

Tests:
1. `watchPort` calls `onReady` when a test HTTP server starts
2. `watchPort` calls `onTimeout` after timeout with no server
3. `stop()` function cancels watching (no more callbacks after stop)
4. Handles ECONNREFUSED without crashing
5. Respects `pollIntervalMs` timing (approx)

---

### Task 5.2 — Unit tests: config
**Status**: `[x]`

File: `tests/config.test.js`

Tests:
1. `loadConfig` reads a valid `.sesy.json`
2. `loadConfig` throws SesyError when file missing
3. `validateConfig` throws on invalid `framework` value
4. `validateConfig` throws on non-numeric port
5. `createDefaultConfig` writes correct defaults

---

### Task 5.3 — Unit tests: logger
**Status**: `[x]`

File: `tests/logger.test.js`

Tests:
1. `log.info` writes to stdout
2. `log.error` writes to stderr
3. `log.debug` suppressed without SESY_DEBUG=1
4. `log.debug` prints with SESY_DEBUG=1
5. No chalk color codes when `NO_COLOR=1`

---

## Phase 6 — Documentation

### Task 6.1 — Getting started guide
**Status**: `[x]`

File: `docs/getting-started.md`

Must cover:
- Prerequisites (Node.js >= 18, SSH port forwarding set up)
- `npm i @xgauravyaduvanshii/sesy`
- Running first project in 5 minutes (step by step with code blocks)
- Verifying it works

---

### Task 6.2 — How it works (architecture)
**Status**: `[x]`

File: `docs/how-it-works.md`

Must cover:
- Why Electron projects can't just use Chrome like web projects
- The SSH port forwarding layer (already handled by VSCode/ssh -L)
- What sesy adds: port detection + local Electron spawn
- The temp bridge main.js approach
- Security model (contextIsolation on, nodeIntegration off)
- ASCII architecture diagram in the doc

---

### Task 6.3 — Command reference
**Status**: `[x]`

Files:
- `docs/commands/watch.md` — every flag, every output line explained
- `docs/commands/init.md` — options, what the config file looks like after
- `docs/commands/status.md` — how to read the output
- `docs/commands/doctor.md` — what each check means, how to fix failures

---

### Task 6.4 — Configuration reference
**Status**: `[x]`

File: `docs/configuration.md`

Table with every `.sesy.json` field:

| Field | Type | Default | Description |
|---|---|---|---|
| port | number | 8000 | Port your dev server starts on |
| framework | string | "electron" | App framework |
| windowWidth | number | 1280 | Electron window width in px |
| windowHeight | number | 800 | Electron window height in px |
| pollIntervalMs | number | 500 | How often to check if port is alive |
| pollTimeoutMs | number | 60000 | Give up after this many ms |
| electronArgs | array | [] | Extra args passed to Electron |
| env | object | {} | Extra env vars for Electron process |

---

### Task 6.5 — Troubleshooting guide
**Status**: `[x]`

File: `docs/troubleshooting.md`

Must have a section for every known error with:
- What the error message looks like
- Why it happens
- Exact steps to fix it

Errors to cover:
- `Port timeout` — SSH tunnel not set up correctly
- `Electron not found` — installation issue
- `.sesy.json not found` — run sesy init
- `EADDRINUSE` — port already in use locally
- Electron window flashes and closes — dev server crashed
- Black window / blank screen — renderer error

---

### Task 6.6 — Advanced: multiple projects
**Status**: `[x]`

File: `docs/advanced/multiple-projects.md`

Explain how to:
- Run two different SSH Electron projects on different ports simultaneously
- Use different `.sesy.json` configs in different directories
- Alias `sesy watch --port 9000` in package.json scripts

---

## Phase 7 — Release prep

### Task 7.1 — package.json finalization
**Status**: `[x]`

Ensure package.json has:
- `engines: { "node": ">=18" }`
- `files` array (only ship `bin/`, `src/`, `docs/`, `README.md`)
- `keywords`: `["electron", "ssh", "remote-dev", "cli", "developer-tools"]`
- `repository`, `homepage`, `bugs` fields
- `postinstall` script that prints "sesy installed! Run: sesy doctor"

---

### Task 7.2 — README.md final version
**Status**: `[x]`

File: `README.md`

Sections:
1. Badge row (npm version, license, node version)
2. What is sesy (2 sentences)
3. How it works (3-step visual ASCII)
4. Install
5. Quick start (5 steps)
6. Commands table
7. Configuration table
8. Troubleshooting link
9. Contributing
10. License (MIT)

---

## Task completion tracker

| Task | Status | Files |
|---|---|---|
| 1.1 Scaffold | `[x]` | package.json, .gitignore, README, bin/sesy.js |
| 1.2 Constants | `[x]` | src/constants.js |
| 1.3 Logger | `[x]` | src/utils/logger.js |
| 1.4 Errors | `[x]` | src/utils/errors.js |
| 2.1 Config | `[x]` | src/core/config.js |
| 2.2 Watcher | `[x]` | src/core/watcher.js |
| 2.3 Launcher | `[x]` | src/core/launcher.js |
| 3.1 init cmd | `[x]` | src/commands/init.js |
| 3.2 watch cmd | `[x]` | src/commands/watch.js |
| 3.3 status cmd | `[x]` | src/commands/status.js |
| 3.4 doctor cmd | `[x]` | src/commands/doctor.js |
| 4.1 Error handler | `[x]` | src/utils/globalErrorHandler.js |
| 4.2 First run | `[x]` | src/utils/firstRun.js |
| 5.1 Watcher tests | `[x]` | tests/watcher.test.js |
| 5.2 Config tests | `[x]` | tests/config.test.js |
| 5.3 Logger tests | `[x]` | tests/logger.test.js |
| 6.1 Getting started | `[x]` | docs/getting-started.md |
| 6.2 How it works | `[x]` | docs/how-it-works.md |
| 6.3 Command reference | `[x]` | docs/commands/*.md |
| 6.4 Config reference | `[x]` | docs/configuration.md |
| 6.5 Troubleshooting | `[x]` | docs/troubleshooting.md |
| 6.6 Advanced | `[x]` | docs/advanced/*.md |
| 7.1 package.json | `[x]` | package.json |
| 7.2 README final | `[x]` | README.md |
