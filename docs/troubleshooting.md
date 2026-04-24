# Troubleshooting

## `initSesyGuard()` called too late

If you see a warning about `app.isReady()`, move `initSesyGuard()` higher in your main entry file. It must run before `app.whenReady()` for the injected flags to matter.

## App still crashes in SSH

Double-check that:

- `initSesyGuard()` runs before any Electron startup logic
- `SESY_MODE` is not set to `local`
- you are editing the real Electron main process entry file, not a preload or renderer file

## SSH mode detected on a local Mac

If your machine is behaving like a remote session during testing, force local mode:

```bash
SESY_MODE=local npm run dev
```

## Renderer dev server not starting

`sesy-guard` only protects the Electron main process. If Vite, webpack, or another renderer tool still fails, debug that renderer stack separately.

## Black window when connecting with sesy CLI

The main process survived, but the renderer likely crashed or never served usable HTML. Check the SSH terminal output for renderer build errors.

## TypeScript: cannot find module `@xgauravyaduvanshii/sesy-guard`

Make sure your TypeScript config uses modern Node-style resolution such as `moduleResolution: "node16"` or `moduleResolution: "bundler"` so the package `exports` field is respected.
