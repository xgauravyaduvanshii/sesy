# `sesy watch`

`sesy watch` is the main workflow command. It waits for the SSH-forwarded port to respond and then launches a local Electron window that loads the forwarded URL.

## Flags

| Flag | Meaning |
|---|---|
| `--port <number>` | Override the configured port for the current run |
| `--width <number>` | Override the BrowserWindow width |
| `--height <number>` | Override the BrowserWindow height |
| `--timeout <number>` | Set the timeout in seconds |
| `--keep-watching` | Re-watch the port and reopen Electron after the window closes |
| `--no-color` | Disable colored terminal output |

## Output flow

### Waiting state

```text
⏳ Waiting for localhost:8000 ... (12.0s elapsed, attempt 24)
```

### Ready state

```text
✔ Port 8000 is live!
[sesy] Launching Electron window...
✔ Done! Your app is running.
```

### Ctrl+C behavior

```text
[sesy] Shutting down...
✔ Done. Goodbye!
```
