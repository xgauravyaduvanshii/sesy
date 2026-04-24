# prompt.md — Master Codex Prompt for Sesy

> Copy the entire content below this line and paste it to Codex / Claude / your AI agent to start building.

---

## SYSTEM PROMPT (paste in System / Instructions field)

You are a senior Node.js CLI engineer. You write complete, production-ready code. You never write stubs, placeholders, or TODOs. When asked to build a feature, you deliver the entire working implementation including error handling, cross-platform support, and JSDoc comments. You follow the project's coding standards exactly as specified. You think before you code — you read the full spec, ask no clarifying questions (all specs are complete), and immediately produce the implementation.

---

## USER PROMPT (paste in the user message to start)

Build **sesy** — a Node.js CLI tool that allows developers to run remote Electron projects locally via SSH port forwarding.

### The core problem sesy solves

Developers work on Electron desktop app projects hosted on remote SSH servers. Web projects (React, Next.js, etc.) are easy — SSH port forwarding maps `remote:3000` to `local:3000`, and the developer opens Chrome. But Electron apps are not browser apps. They need a native desktop window. There's no way to "open in Chrome" — you need an actual `Electron` process running on the local machine.

**Sesy solves this.** Once the developer has SSH port forwarding active (which VSCode Remote SSH handles automatically), sesy:

1. Watches the forwarded `localhost:{port}` on the local machine
2. When the remote dev server becomes reachable via that port, sesy spawns a local `Electron` process
3. That Electron process opens a `BrowserWindow` loading `http://localhost:{port}`
4. The developer sees their Electron app running locally, rendered from their remote SSH code

This is identical to the web dev experience — but for Electron. The developer edits code on SSH, the renderer is served on the forwarded port, and the native desktop window runs locally.

---

### Project name and package

- Package name: `sesy`
- npm install: `npm i @xgauravyaduvanshii/sesy`
- Node.js minimum: 18
- Main commands: `sesy watch`, `sesy init`, `sesy status`, `sesy doctor`

---

### Complete project file structure to build

```
sesy/
├── bin/
│   └── sesy.js                    ← CLI entry, shebang, commander root setup
├── src/
│   ├── constants.js               ← all default values
│   ├── commands/
│   │   ├── watch.js               ← main command: watch port + launch Electron
│   │   ├── init.js                ← create .sesy.json
│   │   ├── status.js              ← diagnostic info
│   │   └── doctor.js              ← health checks with fix hints
│   ├── core/
│   │   ├── config.js              ← load, validate, create .sesy.json
│   │   ├── watcher.js             ← poll localhost:port, call onReady
│   │   └── launcher.js            ← spawn local Electron with loadURL
│   └── utils/
│       ├── logger.js              ← chalk-based log.info/success/warn/error/debug
│       ├── errors.js              ← SesyError class + factory functions
│       ├── globalErrorHandler.js  ← top-level process error handlers
│       └── firstRun.js            ← banner + quickstart on first install
├── docs/
│   ├── getting-started.md
│   ├── how-it-works.md
│   ├── configuration.md
│   ├── troubleshooting.md
│   ├── commands/
│   │   ├── watch.md
│   │   ├── init.md
│   │   ├── status.md
│   │   └── doctor.md
│   └── advanced/
│       ├── multiple-projects.md
│       └── custom-electron.md
├── tests/
│   ├── watcher.test.js
│   ├── config.test.js
│   └── logger.test.js
├── package.json
├── README.md
└── .gitignore
```

---

### package.json — exact spec

```json
{
  "name": "sesy",
  "version": "0.1.0",
  "description": "Run your remote SSH Electron project in a local window — instantly.",
  "type": "module",
  "bin": {
    "sesy": "./bin/sesy.js"
  },
  "engines": {
    "node": ">=18"
  },
  "files": [
    "bin/",
    "src/",
    "docs/",
    "README.md"
  ],
  "keywords": ["electron", "ssh", "remote-dev", "cli", "developer-tools", "desktop"],
  "license": "MIT",
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "electron": "^30.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  },
  "scripts": {
    "start": "node bin/sesy.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest",
    "postinstall": "node -e \"console.log('\\n✔ sesy installed! Run: sesy doctor\\n')\""
  }
}
```

---

### src/constants.js — exact spec

```js
/**
 * sesy — constants.js
 * All default configuration values and magic strings in one place.
 */

export const DEFAULTS = {
  PORT: 8000,
  POLL_INTERVAL_MS: 500,
  POLL_TIMEOUT_MS: 60000,
  WINDOW_WIDTH: 1280,
  WINDOW_HEIGHT: 800,
  CONFIG_FILENAME: '.sesy.json',
  LOG_PREFIX: '[sesy]',
  TEMP_DIR_NAME: 'sesy',
  FIRST_RUN_FLAG: '.sesy-first-run-done',
};

export const SUPPORTED_FRAMEWORKS = ['electron'];

export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  CONFIG_NOT_FOUND: 2,
  PORT_TIMEOUT: 3,
  ELECTRON_NOT_FOUND: 4,
};
```

---

### src/utils/logger.js — behavior spec

The logger uses `chalk`. All methods must:
- Accept any number of arguments (spread them into the message)
- Prepend the appropriate prefix + icon
- Write `info/success/warn` to `process.stdout`
- Write `error` to `process.stderr`
- `debug` only logs when `process.env.SESY_DEBUG === '1'`
- Automatically strip ANSI codes when `process.env.NO_COLOR` is set or stdout is not a TTY

Methods:
```
log.info(msg)     →  [sesy] msg          (cyan prefix, white msg)
log.success(msg)  →  ✔ msg              (green)
log.warn(msg)     →  ⚠ msg             (yellow)
log.error(msg)    →  ✖ msg             (red, to stderr)
log.debug(msg)    →  › msg             (gray, only if SESY_DEBUG=1)
log.blank()       →  (empty line)
log.banner()      →  ASCII art + tagline
```

---

### src/utils/errors.js — exact spec

```js
/**
 * sesy — errors.js
 * Custom error class and pre-built error factories with developer-friendly hints.
 */

export class SesyError extends Error {
  constructor(message, hint = null) {
    super(message);
    this.name = 'SesyError';
    this.hint = hint;
  }
}

export const Errors = {
  portInUse: (port) => new SesyError(
    `Port ${port} is already in use on this machine.`,
    `Another process is using port ${port}. Run: lsof -i :${port} to find it.`
  ),
  configNotFound: (path) => new SesyError(
    `No .sesy.json found at: ${path}`,
    `Run 'sesy init' in your project directory to create one.`
  ),
  configInvalid: (field, reason) => new SesyError(
    `Invalid config field '${field}': ${reason}`,
    `Edit your .sesy.json and fix the '${field}' field.`
  ),
  electronNotFound: () => new SesyError(
    `Electron binary not found.`,
    `Try reinstalling sesy: npm i @xgauravyaduvanshii/sesy`
  ),
  portTimeout: (port, timeoutMs) => new SesyError(
    `Timed out waiting for localhost:${port} after ${timeoutMs / 1000}s.`,
    `Make sure your SSH tunnel is active and your dev server is running on the remote machine.`
  ),
};
```

---

### src/core/watcher.js — exact behavior spec

`watchPort(options)` must:

1. Start polling `http://localhost:{port}` every `pollIntervalMs` milliseconds using native `http.get()`
2. Call `options.onReady()` the first time the port responds to any HTTP request (even a 404 counts as ready)
3. Call `options.onTimeout()` if `pollTimeoutMs` elapses with no response
4. Call `options.onRetry({ attempt, elapsedMs })` on each failed poll attempt
5. Return a `stop()` function that cancels all polling immediately

Error handling:
- `ECONNREFUSED` — normal, port not ready yet, continue polling silently
- `ECONNRESET`, `ETIMEDOUT`, `EHOSTUNREACH` — log as debug, continue polling
- Any other error — log as warn, continue polling (never crash)

Do NOT use `setTimeout` recursively — use `setInterval` with a guard flag to prevent overlapping checks if a check takes longer than the interval.

---

### src/core/launcher.js — exact behavior spec

`launchElectron(url, options)` must:

1. Get the Electron binary path:
   ```js
   import electronPath from 'electron';
   // electron package exports the path to the binary as its default export
   ```

2. Write this file to `os.tmpdir()/sesy/bridge-main.js`:
   ```js
   import { app, BrowserWindow } from 'electron';
   
   app.whenReady().then(() => {
     const win = new BrowserWindow({
       width: Number(process.env.SESY_WIDTH) || 1280,
       height: Number(process.env.SESY_HEIGHT) || 800,
       title: 'sesy — ' + process.env.SESY_URL,
       webPreferences: {
         nodeIntegration: false,
         contextIsolation: true,
       },
     });
     win.loadURL(process.env.SESY_URL);
   });
   
   app.on('window-all-closed', () => app.quit());
   ```

3. Spawn Electron with env vars:
   ```js
   spawn(electronPath, [bridgeMainPath, ...options.electronArgs], {
     env: {
       ...process.env,
       SESY_URL: url,
       SESY_WIDTH: String(options.windowWidth),
       SESY_HEIGHT: String(options.windowHeight),
       ...options.env,
     },
     stdio: 'inherit',
   });
   ```

4. Return the `ChildProcess` so the caller can kill it on Ctrl+C.

Windows note: on Windows, `electron` package exports a `.exe` path. Use `spawn` not `exec`. The `stdio: 'inherit'` ensures the Electron process output shows in the terminal.

---

### src/commands/watch.js — full UX flow

```
$ sesy watch

  ███████╗███████╗███████╗██╗   ██╗
  ...banner...

  ⏳ Watching localhost:8000 for your Electron app...
     (SSH tunnel must be active. Timeout: 60s)

  [attempt 1] not ready yet... (0.5s elapsed)
  [attempt 2] not ready yet... (1.0s elapsed)
  ...

  ✔ Port 8000 is live!
  ⚡ Launching Electron...
  ✔ Electron window opened!

     Your app is running at localhost:8000
     Press Ctrl+C to stop.
```

On Ctrl+C:
```
  Shutting down...
  ✔ Done. Goodbye!
```

The `--keep-watching` flag means: when the Electron process exits (user closes the window), restart watching for port and re-launch when it becomes available again.

---

### src/commands/init.js — full UX flow

```
$ sesy init

  Creating .sesy.json...

  ✔ Created .sesy.json

  Next steps:
  1. On your SSH server, run:     npm run dev
  2. On this machine, run:        sesy watch

  Run 'sesy doctor' to verify your setup is ready.
```

If `.sesy.json` already exists:
```
  .sesy.json already exists.
  Run with --force to overwrite.
```

---

### src/commands/doctor.js — all checks

Run these checks in order. Print result for each. Exit 1 if any fail.

| Check | Pass condition | Hint on fail |
|---|---|---|
| Node.js >= 18 | `process.version` semver check | Upgrade Node.js from nodejs.org |
| sesy installed | `which sesy` returns a path | `npm i @xgauravyaduvanshii/sesy` |
| Electron binary | `electron` package path exists on disk | Reinstall sesy |
| `.sesy.json` present | file exists in cwd | Run `sesy init` |
| `.sesy.json` valid | passes `validateConfig()` | Edit the config file |
| Port reachable | HTTP GET to configured port succeeds | Check SSH tunnel and dev server |

---

### Docs — complete content requirements

#### docs/getting-started.md
Must include:
- What sesy does (1 paragraph)
- Prerequisites: Node 18+, SSH port forwarding active (explain this means VSCode Remote SSH works, or manual `-L` flag)
- Install: `npm i @xgauravyaduvanshii/sesy`
- Step 1: In your SSH project directory, run `sesy init`
- Step 2: Start your Electron dev server on the SSH machine (`npm run dev`)
- Step 3: On your local machine, run `sesy watch`
- Step 4: See your app!
- Link to troubleshooting if something goes wrong

#### docs/how-it-works.md
Must include:
- The problem: Electron ≠ browser (explain why Chrome doesn't work)
- The SSH port forwarding layer (this pre-exists, sesy builds on top of it)
- The sesy layer: port watcher + Electron spawner
- Security: why `contextIsolation: true` matters
- ASCII architecture diagram showing: SSH Server → SSH Tunnel → Local Port → sesy watcher → Electron window

#### docs/configuration.md
Full table of every `.sesy.json` field with: field name, type, default, description, example.

#### docs/troubleshooting.md
One section per known error with exact error text, cause, and fix steps. Must cover at minimum:
- Port timeout (SSH tunnel not active)
- Electron binary not found
- Config not found
- Blank/black Electron window
- Window closes immediately

#### docs/commands/watch.md
Every flag documented. Every piece of terminal output explained. Common scenarios (waiting, success, error, Ctrl+C).

#### docs/commands/init.md
What it creates, what each field in the output config means.

#### docs/commands/status.md
How to read each line. What "not reachable" means vs "reachable".

#### docs/commands/doctor.md
What each check is testing and why it matters. How to fix each failure.

#### docs/advanced/multiple-projects.md
- How to use two different `.sesy.json` configs
- How to alias `sesy watch --port 9000` in package.json
- Running two sesy instances in separate terminals

---

### Tests — minimum required

#### tests/watcher.test.js
1. Calls `onReady` when HTTP server starts on watched port
2. Calls `onTimeout` after `pollTimeoutMs` with no server
3. `stop()` prevents any callbacks after being called
4. `ECONNREFUSED` does not crash, continues polling
5. `onRetry` is called with correct `attempt` count

#### tests/config.test.js
1. `loadConfig` reads a valid `.sesy.json` correctly
2. `loadConfig` throws `SesyError` when file is missing
3. `validateConfig` throws on invalid `framework` value
4. `validateConfig` throws on non-numeric port
5. `createDefaultConfig` writes all correct default fields

#### tests/logger.test.js
1. `log.info` writes to stdout
2. `log.error` writes to stderr
3. `log.debug` suppressed without `SESY_DEBUG=1`
4. `log.debug` prints with `SESY_DEBUG=1`
5. Methods don't throw when called with no arguments

---

### README.md — required sections

1. Title + ASCII banner
2. One-line description
3. "How it works" in 3 bullet points
4. Install command
5. Quick start in 5 numbered steps
6. Commands table (command | description)
7. Configuration table (field | default | description)
8. Link to /docs for full documentation
9. License: MIT

---

### Coding standards — mandatory

- Every source file has a JSDoc header comment with filename and description
- Every exported function has a JSDoc comment with `@param` and `@returns`
- All async functions wrapped in try/catch
- Errors caught at top level use the global error handler
- No `console.log` — use `log.*` methods everywhere
- No hardcoded numbers or strings outside of `constants.js`
- Cross-platform paths using `path.join()` / `path.resolve()` always
- Never `process.exit()` without printing a message first

---

### How to start

Begin with Phase 1 tasks in order:
1. Create `package.json` with exact spec above
2. Create `src/constants.js`
3. Create `src/utils/logger.js`
4. Create `src/utils/errors.js`
5. Create `bin/sesy.js` with commander setup and all 4 commands registered
6. Then proceed to Phase 2 (core engine) and Phase 3 (commands)

After each file, verify it works by running the relevant command before moving on.

Build the complete project. Do not stop after scaffolding. Every file in the structure above must be fully implemented before the project is considered done.
