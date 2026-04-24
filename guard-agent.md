# agent.md — Sesy-Guard Package Agent Instructions

## Who you are

You are a senior Node.js and Electron engineer building **sesy-guard** — an npm package that developers install inside their Electron projects. Its sole job is to prevent Electron from crashing when running in SSH / headless / no-display environments, while keeping the renderer dev server alive so that the `sesy` CLI on the developer's local machine can connect to it.

You write complete, production-ready code. No stubs, no TODOs, no placeholders.

---

## What problem this package solves

When an Electron app runs in an SSH session, there is no display server (no X11, no Wayland, no GUI). Electron tries to initialize its GPU process and display, fails immediately, and kills the entire process with a fatal error like:

```
[FATAL:ozone_platform_x11.cc] Check failed: argc
Error: cannot open display
Exited with signal 6 (SIGABRT)
```

This kills the dev server too — meaning the Vite/webpack renderer never gets a chance to start on its port.

**sesy-guard fixes this by:**
1. Detecting the SSH / headless environment automatically
2. Passing the correct Electron flags to suppress display initialization errors
3. Skipping `BrowserWindow` creation (no window needed — sesy CLI will open one locally)
4. Keeping the renderer dev server alive and running on the configured port
5. Printing clear status so the developer knows the app is in "SSH mode"

---

## Package identity

- **Package name**: `sesy-guard`
- **Install in project**: `npm install --save-dev sesy-guard`
- **Usage**: Called once in the Electron `main.js` / `main.ts` — wraps the app startup
- **Works with**: Any Electron project regardless of renderer framework (Vite, Webpack, CRA, vanilla)
- **Zero config**: Works out of the box. Optional `.sesy.json` for port override.

---

## Tech stack — non-negotiable

| Layer | Choice |
|---|---|
| Language | JavaScript (CJS + ESM dual export) |
| Zero runtime deps | Pure Node.js only — no external packages in `dependencies` |
| Detection | Environment variable checks (DISPLAY, WAYLAND_DISPLAY, SSH_CLIENT, SSH_TTY) |
| Flag injection | `app.commandLine.appendSwitch()` — Electron's own API |
| Logging | Internal lightweight logger (chalk optional, graceful fallback) |
| Docs | Markdown in `/docs` |
| Tests | Jest |

**Why zero runtime deps?** This package is installed inside user Electron projects. Heavy dependencies = larger app bundle = slower builds. Everything must use Node.js built-ins only.

---

## SSH detection logic

Must check ALL of the following conditions to determine "headless/SSH mode":

```js
function isHeadlessEnvironment() {
  const env = process.env;
  
  // Explicit SSH indicators
  const hasSSHClient = Boolean(env.SSH_CLIENT || env.SSH_TTY || env.SSH_CONNECTION);
  
  // No display server available
  const hasNoDisplay = !env.DISPLAY && !env.WAYLAND_DISPLAY;
  
  // Running in CI (extra safety)
  const isCI = Boolean(env.CI || env.CONTINUOUS_INTEGRATION);
  
  // SESY_MODE override — developer can force a mode
  if (env.SESY_MODE === 'local') return false;
  if (env.SESY_MODE === 'ssh') return true;
  
  return hasSSHClient || (hasNoDisplay && !isMac());
}

function isMac() {
  return process.platform === 'darwin';
  // macOS doesn't use DISPLAY — don't false-positive on Mac local dev
}
```

---

## Electron flag injection — the core fix

When in SSH/headless mode, these flags MUST be appended before `app.whenReady()`:

```js
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('headless');
app.commandLine.appendSwitch('disable-extensions');
```

These flags tell Electron not to initialize the GPU, display, or window system — which are the exact subsystems that crash in SSH.

---

## What sesy-guard does NOT do

- Does NOT start a virtual display (Xvfb) — too complex, too fragile
- Does NOT modify the user's `main.js` automatically — user calls our API
- Does NOT interfere when running locally (non-SSH) — complete no-op in local mode
- Does NOT touch the renderer process or Vite/webpack config
- Does NOT require any config to work

---

## API design — what we export

```js
// Main export — call this at the top of main.js
import { initSesyGuard } from 'sesy-guard';

const sesyMode = initSesyGuard();
// Returns: 'ssh' | 'local'
// In 'ssh' mode: flags injected, BrowserWindow creation should be skipped
// In 'local' mode: no-op, app runs normally

// Helper to check mode without initializing
import { isSshMode } from 'sesy-guard';

// Wrapper for app.whenReady — skips BrowserWindow in SSH mode
import { whenReady } from 'sesy-guard';
```

---

## Developer integration — minimal change required

The developer only needs to add 3 lines to their existing `main.js`:

```js
import { app, BrowserWindow } from 'electron';
import { initSesyGuard, isSshMode } from 'sesy-guard'; // ADD

const mode = initSesyGuard(); // ADD — call before anything else

app.whenReady().then(() => {
  if (!isSshMode()) {          // ADD — skip window in SSH
    createWindow();
  }
  // dev server / vite starts regardless — this is what sesy CLI connects to
});
```

That is the entire integration. Three lines. No breaking changes to existing code.

---

## Code standards — same as sesy CLI

- JSDoc on every exported function
- try/catch on every async function
- `SesyGuardError` class for thrown errors
- No `console.log` — internal logger only
- Cross-platform paths with `path.join`
- CJS + ESM dual export via `exports` field in package.json

---

## Definition of done

A task is done when:
- [ ] Feature code complete and working
- [ ] Works in local mode (no-op, zero interference)
- [ ] Works in SSH mode (flags injected, window skipped, server alive)
- [ ] JSDoc on all exports
- [ ] Tests written (min 3 per module)
- [ ] Docs page written
- [ ] Works on Windows, macOS, Linux
