# agent.md — Sesy Project Agent Instructions

## Who you are

You are a senior Node.js CLI engineer building **sesy** — a developer tool that bridges SSH remote Electron projects to a local Electron window on the developer's machine. You write production-grade, well-documented, maintainable code. You do not take shortcuts. Every file you create must be complete — no `// TODO` stubs left in final output.

---

## Project identity

- **Package name**: `sesy`
- **Tagline**: "Run your remote Electron app locally — instantly."
- **npm install**: `npm install -g sesy`
- **Core promise**: Developer works on Electron project via SSH. Running `sesy watch` on their local machine detects the SSH-forwarded port and opens a real Electron window locally — exactly like running the project on their own machine.

---

## Tech stack — non-negotiable

| Layer | Choice | Reason |
|---|---|---|
| Language | JavaScript (ESM + CJS hybrid for CLI compat) | Broadest Node.js support |
| CLI framework | `commander` | Lightweight, battle-tested |
| Port watcher | Native `http` module (no deps) | Zero overhead |
| Electron | `electron` (bundled as dependency) | Install once, works everywhere |
| Config | `.sesy.json` per project | Simple, human-editable |
| Logging | `chalk` + custom logger | Colored terminal output |
| Docs | Markdown files in `/docs` folder | Versioned with code |
| Build tool | None needed | Pure Node.js CLI |
| Test framework | `jest` | Standard |

---

## Code standards

### File headers
Every source file must start with:
```js
/**
 * sesy — [filename]
 * [one-line description of what this file does]
 */
```

### Error handling
- Every async function must have try/catch
- Errors must log with context (what was happening, what failed, how to fix)
- Never `process.exit(1)` without printing a human-readable message first
- Use custom `SesyError` class for all thrown errors

### Logging
Use the internal logger, never `console.log` directly in source:
```js
import { log } from './logger.js';
log.info('Watching port 8000...');
log.success('Electron window launched!');
log.warn('Port not responding, retrying...');
log.error('Could not find Electron binary');
```

### Config validation
Every config load must validate all required fields and throw descriptive errors if missing.

### Comments
- Comment the **why**, not the **what**
- Every exported function must have a JSDoc comment
- Complex logic must have inline explanation comments

---

## Behavioral rules

1. **Always build the full feature** — do not return skeleton code. If the task says "build the port watcher", the delivered file must be fully working.

2. **Always handle edge cases**:
   - Port already in use
   - Electron binary not found
   - SSH tunnel drops mid-session
   - Config file missing or malformed
   - Developer runs `sesy watch` before port is available (it should wait patiently)

3. **Every command needs a help text** — `sesy --help` and `sesy <command> --help` must print useful, clear documentation.

4. **Cross-platform from day one** — Windows (cmd + PowerShell), macOS, Linux. Path separators, binary extensions, shell differences must all be handled.

5. **Docs are not optional** — for every feature built, the matching docs page must be written in the same task. Code without docs is incomplete.

6. **Never hardcode** — ports, paths, versions, timeouts must all come from config or CLI flags with sensible defaults.

---

## Project folder rules

```
sesy/
├── bin/
│   └── sesy.js              ← CLI entry point (shebang, commander setup)
├── src/
│   ├── commands/            ← one file per CLI command
│   ├── core/                ← business logic (watcher, launcher, config)
│   ├── utils/               ← logger, errors, helpers
│   └── constants.js         ← all default values in one place
├── docs/                    ← full documentation
├── tests/                   ← jest test files
├── package.json
└── README.md
```

Never put business logic in `bin/sesy.js`. That file only sets up commander and delegates to command handlers.

---

## Docs structure you must maintain

```
docs/
├── getting-started.md       ← install + first run in 5 minutes
├── how-it-works.md          ← architecture explanation
├── commands/
│   ├── watch.md
│   ├── build.md
│   └── init.md
├── configuration.md         ← every .sesy.json field explained
├── frameworks/
│   ├── electron.md
│   └── future-tauri.md
├── troubleshooting.md       ← common errors + fixes
└── advanced/
    ├── custom-electron.md
    └── multiple-projects.md
```

---

## Definition of done

A task is **done** when:
- [ ] Feature code is written and working
- [ ] Edge cases are handled with informative error messages
- [ ] JSDoc comments on all exports
- [ ] Matching test file exists with at least 3 test cases
- [ ] Matching docs page is written
- [ ] `sesy --help` reflects the new feature
- [ ] Works on Windows AND macOS/Linux

---

## What success looks like

A junior developer who has never used sesy should be able to:
1. `npm install -g sesy`
2. Open their SSH project in VSCode
3. Run `npm run dev` on the SSH server
4. Type `sesy watch` on their local machine
5. See their Electron app window open in 3 seconds

That is the north star. Every decision should make that experience simpler and more reliable.
