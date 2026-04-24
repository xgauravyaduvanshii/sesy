# Electron Builder

`@xgauravyaduvanshii/sesy-guard` should stay a development-only dependency. It protects remote SSH development, not packaged production builds.

## Keep it as a devDependency

Install it like this:

```bash
npm i @xgauravyaduvanshii/sesy-guard
```

## Exclude it from production packaging

In `electron-builder`, make sure your packaged app does not need the guard:

```json
{
  "build": {
    "files": [
      "!node_modules/@xgauravyaduvanshii/sesy-guard/**"
    ]
  }
}
```

## Safe conditional import

Use a development-only import so production builds work even when the package is not bundled:

```js
if (process.env.NODE_ENV === 'development') {
  const { initSesyGuard, isSshMode } = await import('@xgauravyaduvanshii/sesy-guard');
  initSesyGuard();
}
```

That pattern keeps builder output clean while preserving SSH-safe development behavior.
