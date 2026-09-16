# Real Life Quest

Tablet-first, touch-first, offline PWA for making real-world learning, exercise, chores, persistence, and reflection visible as RPG-style progress.

Stage 2 adds IndexedDB persistence, atomic onboarding saves, versioned migrations, player/settings repositories, and JSON backup primitives to the existing UI shell.

## Local development

Requires Node.js 18 or newer for development; browser self-tests require Node.js 22 or newer. No dependency install or build step is needed.

```powershell
npm run dev
```

Open <http://127.0.0.1:8080>. To use another port in PowerShell:

```powershell
$env:PORT=4173; npm run dev
```

## Checks

```powershell
npm run check
npm run check:persistence
npm test
npm run test:persistence
```

The browser self-test uses a local Chrome, Chromium, or Edge installation with a temporary profile. It verifies actual reloads, migration preservation/rollback, transaction rollback, backup roundtrip, vocabulary storage growth, and guarded reset. `test:stage1-browser` remains an alias for this combined regression.

## Project map

- `index.html`, `css/`, `js/`: runtime app shell
- `data/`: validated runtime data packs (empty at Stage 0)
- `assets/`: supplied canonical and future production assets
- `tests/`: automated checks
- `00_START_HERE/` through `06_GUIDES/`: authoritative handoff material

Read `AGENTS.md` before making changes. See `DATA_SCHEMA.md` for keys, migration rules, backup limits, and the development-only reset API. IndexedDB belongs to the current browser/origin: keep the same localhost port to reuse saved data.
