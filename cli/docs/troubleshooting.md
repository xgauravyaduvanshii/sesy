# Troubleshooting

## Timed out waiting for localhost:8000 after 60s.

### Why it happens

The remote dev server never became reachable through the local forwarded port before the timeout elapsed.

### Fix steps

1. Confirm the remote Electron dev server is actually running.
2. Check that SSH port forwarding is active.
3. Re-run `sesy watch --timeout 120` if startup is naturally slow.
4. Run `sesy doctor` to verify the port and config together.

## Electron binary not found.

### Why it happens

The local Electron dependency was not installed correctly or the binary path no longer exists on disk.

### Fix steps

1. Reinstall the package with `npm i @xgauravyaduvanshii/sesy`.
2. Run `sesy doctor` to confirm the binary path is valid.
3. If you are developing locally, run `npm install` inside the repo first.

## No .sesy.json found at: <path>

### Why it happens

You ran a project-scoped command outside a sesy-configured directory.

### Fix steps

1. Change into the correct project directory.
2. Run `sesy init` to generate a config.
3. Re-run the original command.

## Blank or black Electron window

### Why it happens

The forwarded port may be responding before the renderer finishes building, or the renderer itself may be crashing on load.

### Fix steps

1. Wait a few extra seconds to see whether the renderer recovers.
2. Run the remote dev server in verbose mode and look for build failures.
3. Add logging flags through `.sesy.json` using `electronArgs` or `env`.
4. Confirm the forwarded URL loads in a browser on the local machine.

## Window closes immediately

### Why it happens

Electron may exit if the renderer crashes, the bridge process fails to load the URL, or the remote dev server drops as soon as the window opens.

### Fix steps

1. Re-run with `SESY_DEBUG=1 sesy watch` to surface extra diagnostics.
2. Confirm the remote renderer stays alive after startup.
3. Use `sesy watch --keep-watching` if the renderer restarts during development.
