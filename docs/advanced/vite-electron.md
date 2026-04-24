# Vite + Electron

For `electron-vite` and `vite-plugin-electron`, integrate `sesy-guard` in the Electron main entry, not in Vite config files.

## Correct placement

```ts
import { app } from 'electron';
import { initSesyGuard, isSshMode } from 'sesy-guard';

initSesyGuard();

app.whenReady().then(() => {
  if (!isSshMode()) {
    createMainWindow();
  }
});
```

## Why this works

The crash happens during Electron main-process startup. Vite config cannot stop that failure because it runs in a different part of the toolchain.

## Finding the Vite port

Look for the renderer URL in your dev output, for example:

```text
Local:   http://localhost:5173/
```

That is the port you forward over SSH and the same port your local `sesy` CLI should watch.
