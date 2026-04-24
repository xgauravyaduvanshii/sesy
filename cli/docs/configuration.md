# Configuration Reference

Every sesy project is configured through a `.sesy.json` file in the working directory.

## Schema

| Field | Type | Default | Description | Example |
|---|---|---|---|---|
| `port` | number | `8000` | Port your dev server starts on locally after SSH forwarding | `8000` |
| `framework` | string | `"electron"` | App framework selector. Only `electron` is supported today | `"electron"` |
| `windowWidth` | number | `1280` | Electron window width in pixels | `1440` |
| `windowHeight` | number | `800` | Electron window height in pixels | `900` |
| `pollIntervalMs` | number | `500` | How often sesy checks the forwarded port | `250` |
| `pollTimeoutMs` | number | `60000` | Maximum wait before `sesy watch` fails | `90000` |
| `electronArgs` | array | `[]` | Extra arguments passed to the Electron binary | `["--disable-http-cache"]` |
| `env` | object | `{}` | Extra environment variables passed to the Electron process | `{"ELECTRON_ENABLE_LOGGING":"1"}` |

## Example file

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
