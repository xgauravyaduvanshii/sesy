# Webpack + Electron

If your Electron project uses webpack for either the main process or renderer, `sesy-guard` still belongs in the Electron main entry file, not in webpack configuration.

## Where to initialize it

Put the guard at the very top of your main-process source:

```js
import { app } from 'electron';
import { initSesyGuard, isSshMode } from 'sesy-guard';

initSesyGuard();

app.whenReady().then(() => {
  if (!isSshMode()) {
    createWindow();
  }
});
```

## Why not webpack config

Webpack config can shape your bundles, but it does not prevent Electron from crashing during runtime startup on a no-display SSH machine. The guard has to run inside the actual main process before `app.whenReady()`.

## Finding the renderer port

If webpack dev server prints something like:

```text
Project is running at http://localhost:8080/
```

that is the port you forward over SSH and the same port your local `sesy` CLI should watch.
