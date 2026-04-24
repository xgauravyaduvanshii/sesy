# How It Works

Electron projects are not the same as browser projects. When you forward a React or Next.js port over SSH, you can open Chrome and point it at `localhost:3000`. Electron is different because the renderer expects to be hosted inside a native Electron shell with a real `BrowserWindow`.

## The SSH layer already exists

`sesy` does not replace SSH port forwarding. It assumes you already have a tunnel from the remote server to the local machine, either through VS Code Remote SSH or a manual `ssh -L` command.

## What sesy adds

`sesy` adds two things:

1. A watcher that polls `http://localhost:<port>` until the remote dev server becomes reachable through the tunnel.
2. A local Electron launcher that starts a native Electron process and points it at the forwarded URL.

## Bridge file approach

Instead of bundling a permanent Electron main process file into every project, `sesy` writes a temporary bridge script into the system temp directory. That script creates a secure `BrowserWindow` and calls `loadURL(process.env.SESY_URL)`.

## Security defaults

The generated Electron bridge uses:

- `contextIsolation: true`
- `nodeIntegration: false`

## Architecture diagram

```text
Remote SSH Server
  Electron dev server
         |
         v
SSH tunnel / port forwarding
         |
         v
Local localhost:8000
         |
         v
sesy watcher
  polls until ready
         |
         v
sesy launcher
  writes bridge-main.cjs
         |
         v
Local Electron window
  BrowserWindow.loadURL("http://localhost:8000")
```
