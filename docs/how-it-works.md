# How It Works

## Why Electron crashes in SSH

When Electron starts on a remote SSH machine without X11 or Wayland, it still tries to initialize display and GPU subsystems. In headless Linux environments that often fails with errors like:

```text
[FATAL:ozone_platform_x11.cc(247)] Check failed: argc
Trace/breakpoint trap (core dumped)
```

or:

```text
Error: cannot open display
[1] Killed
```

Those failures happen before your renderer dev server gets a chance to finish booting.

## What sesy-guard changes

`sesy-guard` detects the SSH or headless environment, injects safe Electron flags before `app.whenReady()`, and lets the main process survive long enough for the renderer dev server to come online.

The injected flags disable the subsystems most likely to fail remotely:

- sandbox-sensitive startup paths
- GPU acceleration and software rasterization
- background networking and default app startup noise
- non-essential sync, audio, and first-run behavior

## SSH mode vs local mode

- In local mode, `sesy-guard` is a no-op. Your app starts exactly as it did before.
- In SSH mode, `sesy-guard` injects flags and you should skip `BrowserWindow` creation.

Skipping `BrowserWindow` matters because the window would otherwise try to open on the SSH server itself, which has no usable display for local development.

## Full sesy flow

1. `sesy-guard` detects SSH or no-display conditions.
2. Electron flags are injected before startup completes.
3. The Electron main process stays alive instead of crashing.
4. Your renderer dev server starts on its normal port.
5. SSH forwarding exposes that port to your local machine.
6. The `sesy` CLI detects the port and opens a local Electron window.
