# Contributing

Thanks for contributing to `sesy-guard`.

## Development setup

1. Install Node.js `18` or newer.
2. Install dependencies:

```bash
npm install
```

3. Run the test suite:

```bash
npm test
```

## Project expectations

- Keep runtime dependencies at zero.
- Add or update tests for behavior changes.
- Update docs when public behavior or integration steps change.
- Keep source files documented with JSDoc on exported functions.
- Preserve ESM and CommonJS compatibility.

## Pull request checklist

- The change is scoped and explained clearly.
- Tests pass locally.
- New behavior includes docs updates.
- Public API changes include `src/index.d.ts` updates.
- No unrelated formatting or drive-by refactors are mixed in.

## Commit guidance

Small, focused commits are easier to review than one large mixed change. If you touch runtime behavior, try to include tests in the same commit.

## Reporting issues

If you are filing a bug, include:

- operating system
- Node.js version
- Electron version
- whether the problem happens locally, over SSH, or both
- the exact terminal output if possible
