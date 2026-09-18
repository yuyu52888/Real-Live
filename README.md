# Real Life Quest

Tablet-first, touch-first, offline PWA for making real-world learning, exercise, chores, persistence, and reflection visible as RPG-style progress.

The current MVP includes onboarding, quests, English vocabulary, thinking stories, rewards, Boss challenges, Parent Mode, IndexedDB persistence, offline app-shell/core-content caching, and JSON backup/restore.

## Local development

Requires Node.js 18 or newer for development; browser self-tests require Node.js 22 or newer. No dependency install or build step is needed.

```powershell
npm run dev
```

Open <http://127.0.0.1:8080>. Keep the same origin/port to reuse the same IndexedDB data.

## Install and offline use

- Open the app once while online so the Service Worker can cache the app shell and core content.
- Install from the browser/PWA install control when available.
- After the first successful load, the core app, Core 300, task/story/Boss/reward data, and critical first-screen art can launch offline.
- The full production-art library is intentionally not precached because it is about 260 MB; additional same-origin images are cached as they are viewed. When an uncached image is requested while offline, a local fallback icon is shown instead of breaking the page.

## Parent backup and restore

Open **家長 → 設定 → 備份與還原**.

- **匯出 JSON 備份** creates `real-life-quest-backup-YYYY-MM-DD.json` locally.
- **檢查備份** validates a selected file and shows a preview before any data changes.
- **確認還原** atomically replaces the current local IndexedDB data with the validated backup.
- Invalid or failed restores leave the current data untouched.
- DB v1 backups are safely converted to the current DB v2 record layout; unsupported future/other versions are rejected.
- Backup files contain child progress and local parent settings (including the PIN verifier), so keep them private.

## Checks

```powershell
npm run validate:assets
npm run validate:content
npm run check
npm test
npm run test:stage9
node tests/stage1-browser-check.mjs
```

`test:stage9` uses a real local Chrome/Chromium/Edge profile to verify Service Worker control, offline reload, cached core JSON/art, image fallback, and atomic backup/restore. The combined Stage 1 browser regression covers Stages 1–8 persistence and runtime flows.

## Project map

- `index.html`, `css/`, `js/`: runtime app
- `service-worker.js`, `manifest.webmanifest`: PWA/offline entry points
- `data/`, `02_DATA/`, `03_REWARDS_BOSSES/`: runtime copy/content
- `assets/`: production art and PWA icons
- `tests/`: unit, persistence, and real-browser checks
- `00_START_HERE/` through `06_GUIDES/`: authoritative handoff material

Read `AGENTS.md` before making changes. See `DATA_SCHEMA.md` for persistence, migration, and backup rules.
