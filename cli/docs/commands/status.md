# `sesy status`

`sesy status` prints a fast diagnostic snapshot of the current machine and project state.

## Reading the output

| Line | Meaning |
|---|---|
| `Config` | Whether `.sesy.json` exists in the current directory |
| `Port` | Whether the configured port responds locally right now |
| `Electron` | Whether the Electron binary path can be found on disk |
| `sesy version` | The package version installed in the current build |
| `Node.js` | The running Node version |
| `Platform` | The operating system and CPU architecture |
