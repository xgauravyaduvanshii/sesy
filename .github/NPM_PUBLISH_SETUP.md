# npm Publish Setup

This repository can publish both packages from GitHub Actions:

- root package: `sesy-guard`
- `cli/` package: `sesy`

## Required GitHub secret

Create this repository secret:

- `NPM_TOKEN`

The token must be created from the npm account that owns the packages.

## How to publish

### Manual publish from GitHub Actions

Use the `Publish Packages` workflow and choose:

- `sesy-guard`
- `sesy`
- `both`

You can also provide a tag such as `latest` or `beta`.

### Tag-based publish

Push one of these tags:

```bash
git tag sesy-guard-v0.1.0
git push origin sesy-guard-v0.1.0
```

```bash
git tag sesy-v0.1.0
git push origin sesy-v0.1.0
```

## Before first publish

1. Make sure the package names are available on npm.
2. Make sure versions in both `package.json` files are correct.
3. Add the `NPM_TOKEN` GitHub secret.
4. Push the repository to:
   `https://github.com/xgauravyaduvanshii/sesy.git`
