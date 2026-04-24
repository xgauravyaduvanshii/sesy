# Integration Guide

## Pattern 1: Basic Electron main.js

### Before

```js
import { app, BrowserWindow } from 'electron';

app.whenReady().then(() => {
  createWindow();
});
```

### After

```js
import { app, BrowserWindow } from 'electron';
import { initSesyGuard, isSshMode } from '@xgauravyaduvanshii/sesy-guard';

const mode = initSesyGuard();

app.whenReady().then(() => {
  if (!isSshMode()) {
    createWindow();
  }
});
```

## Pattern 2: Electron + Vite

For `electron-vite` or `vite-plugin-electron`, put `initSesyGuard()` in `electron/main.ts` or `electron/main.js`, not in `vite.config.ts`.

```ts
import { app } from 'electron';
import { initSesyGuard, isSshMode } from '@xgauravyaduvanshii/sesy-guard';

const mode = initSesyGuard();

app.whenReady().then(() => {
  if (!isSshMode()) {
    createMainWindow();
  }
});
```

That leaves hot reload alone while protecting the Electron main process during SSH runs.

## Pattern 3: Electron Forge

In Forge projects, add guard initialization at the top of the Forge main entry:

```js
import { app } from 'electron';
import { initSesyGuard, isSshMode } from '@xgauravyaduvanshii/sesy-guard';

initSesyGuard();

app.whenReady().then(() => {
  if (!isSshMode()) {
    createWindow();
  }
});
```

## Pattern 4: TypeScript

`initSesyGuard()` returns a typed mode string:

```ts
import { initSesyGuard } from '@xgauravyaduvanshii/sesy-guard';

const mode: 'ssh' | 'local' = initSesyGuard();
```

That makes it easy to branch on mode without custom type annotations.
