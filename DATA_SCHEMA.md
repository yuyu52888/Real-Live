# Stage 2 persistence

Database: `real-life-quest`, current version **2**. IndexedDB is authoritative; application memory is a rendered snapshot. No LocalStorage persistence is used.

| Store | Stable primary key | Purpose |
| --- | --- | --- |
| player | id (`local-player`) | nickname, avatarVariant, onboardingStep, progress |
| settings | id (`app-settings`) | preferences, salted PIN verifier |
| questHistory | id | completion history |
| approvals | id | approval records |
| rewards | id | reward inventory records |
| transactions | id | reward/EXP transaction records |
| vocabularyPacks | packId | pack metadata |
| vocabularyWords | wordId | vocabulary content |
| wordProgress | wordId | progress independent of content |
| wordSessions | id | learning sessions |
| storyProgress | storyId | story progress |
| bossProgress | bossId | Boss progress |

Use canonical content IDs, semantic event IDs, or `newRecordId()` (UUID). Never use array positions. Only player/settings repositories and onboarding persistence are implemented; other stores reserve boundaries for future services. No EXP calculation or reward issuance is implemented here.

## Migrations and transactions

Version 1 creates stores. Version 2 adds query indexes without changing records. Append numbered migrations in `js/core/db-schema.js`; never modify released migrations or delete/recreate a database. Upgrade callbacks synchronously enqueue IndexedDB operations. If an upgrade fails, IndexedDB rolls back its records and version. Future destructive transformations require a backup first.

`runTransaction` resolves after commit and rejects on abort. Its callback must enqueue operations synchronously; perform network/crypto work before entering it. Connections close on `versionchange`; blocked upgrades surface an actionable error. Player and settings onboarding updates commit together. Reload resumes the saved step; PIN input is cleared from memory after saving a PBKDF2-SHA-256 verifier with a random salt. A four-digit PIN is a local parental control, not encryption; parent verification UI is a later stage.

## Backup primitives

`exportBackup(db)` returns a consistent JSON-compatible snapshot of all stores with format, schemaVersion, dbVersion and exportedAt. `importBackup(db, objectOrJson)` validates IDs, duplicate IDs, profile structure and versions before an atomic merge/upsert. Records absent from a backup remain intact. Unknown or different database versions are rejected until a specific conversion is implemented. Blobs, Dates and other non-JSON values are explicitly rejected; no silent serialization loss.

Backup format version is separate from database version. Store-specific validation for future business records, attachments, preview/confirmation, download/import UI, and cross-version conversion remain for later stages.

## Development reset

No production module imports `js/dev/reset.js`. A developer can explicitly import `resetDevelopmentDatabase` on localhost and provide `{ enabled: true, confirmation: 'RESET <exact db name>', preserveBackup }`. The callback must save the returned snapshot before clearing records. A concurrent change after capture aborts the reset. Clearing is atomic and retains the database schema. No reset button exists in the product UI.

## Verification

Run `npm run check:persistence` and `npm run test:persistence`. The real-browser test uses a temporary profile and UUID-named fixture database; only that fixture database is deleted during cleanup.
