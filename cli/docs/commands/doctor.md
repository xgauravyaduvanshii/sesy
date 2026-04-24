# `sesy doctor`

`sesy doctor` runs a sequence of health checks and prints a clear hint when something fails.

## What it checks

| Check | Why it matters |
|---|---|
| `Node.js >= 18` | sesy requires modern Node APIs |
| `sesy installed` | Confirms the CLI is discoverable from your shell |
| `Electron binary` | Confirms the local Electron runtime exists |
| `.sesy.json` | Confirms the current directory is configured |
| `Port reachable` | Confirms the SSH-forwarded dev server can be reached locally |

## Exit code

- `0` when all checks pass
- `1` when any check fails
