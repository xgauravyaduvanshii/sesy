# Getting Started

`sesy` lets you keep your Electron code on an SSH server while still opening a real local Electron window on your machine. It works on top of existing SSH port forwarding, so the setup feels like local web development instead of remote desktop streaming.

## Prerequisites

- Node.js `18` or newer installed on the machine where you will run `sesy`
- SSH port forwarding active between your local machine and the remote development server
- An Electron project whose renderer or dev server becomes reachable through `localhost:<port>`

If you use VS Code Remote SSH, port forwarding is usually already available. If you use plain SSH, `ssh -L 8000:localhost:8000 your-server` is the pattern to mirror.

## Install

```bash
npm install -g sesy
```

## Run your first project in 5 minutes

### 1. Create a sesy config in your project

```bash
sesy init
```

### 2. Start your Electron app on the SSH machine

```bash
npm run dev
```

### 3. Confirm the forwarded port exists locally

If SSH forwarding is active, your local machine should eventually see the dev server on `localhost:8000`.

### 4. Open the local Electron window

```bash
sesy watch
```

### 5. Verify it worked

You should see the sesy banner, a waiting message, and then a local Electron window loading your app.

If something does not come up, continue with [troubleshooting.md](./troubleshooting.md).
