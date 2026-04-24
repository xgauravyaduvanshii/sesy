# Multiple Projects

You can use sesy with more than one Electron project as long as each project has its own `.sesy.json` and forwarded port.

## Separate configs

Each project directory should keep its own `.sesy.json`.

## Package.json aliases

```json
{
  "scripts": {
    "watch:desktop-a": "sesy watch --port 8000",
    "watch:desktop-b": "sesy watch --port 9000"
  }
}
```

## Running two sessions

Run each project in its own terminal so each sesy process watches a different local port.
