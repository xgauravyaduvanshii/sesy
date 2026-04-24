# Getting Started

`@xgauravyaduvanshii/sesy-guard` solves a very specific remote-development problem: Electron crashes immediately in SSH and headless environments before your renderer dev server can start. That means your remote Vite or webpack server never comes online, so the local `sesy` CLI has nothing to connect to.

## Install

```bash
npm i @xgauravyaduvanshii/sesy-guard
```

## Add the three-line integration

Update your Electron main process:

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

The important part is calling `initSesyGuard()` before `app.whenReady()` and skipping `BrowserWindow` creation in SSH mode.

## Verify it works

On the SSH machine, start your dev flow with debug logging enabled:

```bash
SESY_DEBUG=1 npm run dev
```

Look for messages such as:

- `SSH mode detected`
- `Injected flag: --disable-gpu`
- `Electron flags injected. Dev server will start`

## Next step

Once the remote renderer server is alive, use the companion `sesy` CLI on your local machine to watch the forwarded port and open the native Electron window locally.
