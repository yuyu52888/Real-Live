# Known limitations

Current implementation is through **Stage 9 (PWA / Offline / Backup & Restore)**.

- Core app/content works offline after one successful online Service Worker installation. A completely fresh device still needs one online load before offline use is possible.
- The production-art library is roughly 260 MB, so Stage 9 does not precache every image. Critical first-screen art is precached; other same-origin images are cached as viewed, with a local image fallback when an uncached asset is requested offline.
- Backup/restore is JSON-only. Optional task-photo Blob persistence is not implemented yet.
- Backup conversion currently supports same-version restores and DB v1→v2. Unknown future/other DB versions are rejected until a specific migration exists.
- Backup files are local files and are not encrypted by the app. They contain progress and local settings/PIN verifier and should be stored privately.
- No cloud account, sync, analytics, telemetry, or external upload service is included.
- Vocabulary illustration art remains optional/later; the learning engine works without it.
- Broad visual refinement/animation polish remains Stage 10; final end-to-end acceptance and release hardening remain Stage 11.
