# `sesy init`

`sesy init` creates the project-local `.sesy.json` file that tells sesy which forwarded port and window settings to use.

## Flags

| Flag | Meaning |
|---|---|
| `--port <number>` | Set the initial dev server port |
| `--force` | Overwrite an existing config without prompting |

## Example config

```json
{
  "port": 8000,
  "framework": "electron",
  "windowWidth": 1280,
  "windowHeight": 800,
  "pollIntervalMs": 500,
  "pollTimeoutMs": 60000,
  "electronArgs": [],
  "env": {}
}
```
