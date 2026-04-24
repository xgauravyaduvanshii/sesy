# Custom Electron

Most teams can use the bundled Electron dependency that ships with sesy, but some advanced environments need extra runtime flags or environment variables.

## Extra Electron flags

```json
{
  "electronArgs": ["--disable-http-cache"]
}
```

## Extra environment variables

```json
{
  "env": {
    "ELECTRON_ENABLE_LOGGING": "1"
  }
}
```
