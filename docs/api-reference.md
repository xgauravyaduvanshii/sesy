# API Reference

## `initSesyGuard(options = {})`

### Signature

```js
initSesyGuard(options?: { app?: object; verbose?: boolean }): 'ssh' | 'local'
```

### Description

Initializes `sesy-guard`, detects the current mode, and injects Electron flags when SSH or headless mode is active.

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `options.app` | object | Optional Electron `app` object. If omitted, `sesy-guard` loads Electron itself |
| `options.verbose` | boolean | Whether to print informational logs. Defaults to `true` |

### Returns

`'ssh'` when protective flags were applied, otherwise `'local'`.

### When to call it

Call it at the very top of your Electron `main.js` or `main.ts`, before `app.whenReady()` and before any BrowserWindow logic.

### Example

```js
import { initSesyGuard } from '@xgauravyaduvanshii/sesy-guard';

const mode = initSesyGuard();
```

### Common mistakes

- Calling it after `app.whenReady()`
- Importing it in the renderer process
- Assuming it fixes renderer build errors as well as main-process startup

## `isSshMode()`

### Signature

```js
isSshMode(): boolean
```

### Description

Returns `true` when `sesy-guard` initialized in SSH or headless mode.

### Returns

Boolean mode flag for conditional BrowserWindow creation.

### Example

```js
app.whenReady().then(() => {
  if (!isSshMode()) {
    createWindow();
  }
});
```

### Common mistakes

- Calling it before `initSesyGuard()`
- Using it to determine whether the renderer is healthy

## `getMode()`

### Signature

```js
getMode(): 'ssh' | 'local' | 'unknown'
```

### Description

Returns the current guard mode, including `'unknown'` before initialization.

### Returns

The internal mode state.

### Example

```js
if (getMode() === 'unknown') {
  initSesyGuard();
}
```

### Common mistakes

- Treating `'unknown'` as a production mode
- Forgetting that mode is module-level state and should be initialized once

## Environment variables

### `SESY_MODE`

Overrides auto-detection.

| Value | Effect |
|---|---|
| `ssh` | Force SSH mode even if no SSH variables are present |
| `local` | Force local mode even when SSH variables exist |

Common mistake: setting any other value. That throws a `SesyGuardError`.

### `SESY_DEBUG`

Set `SESY_DEBUG=1` to print per-flag debug output and mode details.

### `NO_COLOR`

Set `NO_COLOR=1` to disable ANSI color output in the logger.
