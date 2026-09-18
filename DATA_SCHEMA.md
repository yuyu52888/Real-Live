# Real Life Quest persistence and backup

Database: `real-life-quest`, current version **2**. IndexedDB is authoritative; application memory is a rendered snapshot. No LocalStorage persistence is used for critical state.

| Store | Stable primary key | Purpose |
| --- | --- | --- |
| player | id (`local-player`) | nickname, avatarVariant, onboardingStep, progress |
| settings | id (`app-settings`) | preferences, salted PIN verifier |
| questHistory | id | quest completion/progress history |
| approvals | id | parent approval and return history |
| rewards | id | inventory, chests, fragments, claims |
| transactions | id | reward/EXP transactions |
| vocabularyPacks | packId | vocabulary pack metadata |
| vocabularyWords | wordId | vocabulary content |
| wordProgress | wordId | progress independent of content |
| wordSessions | id | learning sessions |
| storyProgress | storyId | thinking-story progress |
| bossProgress | bossId | Boss steps/defeat/reward recovery |

Use canonical content IDs, semantic event IDs, or UUIDs. Never use array positions as persistent IDs.

## Migrations and transactions

Version 1 creates all stores. Version 2 adds indexes without changing record shapes. Append numbered migrations in `js/core/db-schema.js`; never modify a released migration or delete/recreate a production database. Upgrade callbacks enqueue IndexedDB operations synchronously, and IndexedDB rolls back both records and version if an upgrade fails.

`runTransaction` resolves only after commit and rejects on abort. Player/settings onboarding saves are atomic. PIN input is not persisted: only a PBKDF2-SHA-256 verifier with random salt is stored. The four-digit PIN is a local parental control, not encryption.

## Backup format

`exportBackup(db)` returns a JSON-compatible snapshot of every store plus:

- `format: "real-life-quest"`
- backup `schemaVersion`
- `dbVersion`
- `exportedAt`

The product UI serializes this as `real-life-quest-backup-YYYY-MM-DD.json`. Non-JSON values such as Blob, Date objects, or `undefined` are rejected rather than silently dropped.

### Preview and validation

`previewBackup(input, currentDbVersion)` parses and validates the complete backup before mutation. It validates store presence, stable primary keys, duplicate IDs, player/settings pairing, onboarding structure, EXP values, and PIN verifier structure. DB v1→v2 is supported because v2 only adds indexes and keeps the same record/store layout. Other unsupported database versions are rejected explicitly.

### Restore semantics

`restoreBackup(db, input)` is the product restore path. After validation/migration, it clears and repopulates all stores in **one** read/write IndexedDB transaction. The result is a full replacement matching the selected backup. If any write aborts, the whole transaction rolls back and the pre-restore data remains intact.

`importBackup(db, input)` remains as the older merge/upsert primitive for backward compatibility and targeted tests; the Parent restore UI does not use it.

Restore confirmation is a Parent Mode UI concern: the selected file is first previewed, then the parent must explicitly confirm. The in-memory preview is cleared when leaving Parent Mode. After a successful restore the app reloads, so Parent Mode is locked again and the restored PIN verifier applies.

## Attachments

Stage 9 backups are intentionally JSON-only. Optional task-photo Blob persistence is not part of the current MVP and therefore is not silently omitted from backups.

## Development reset

No production module imports `js/dev/reset.js`. The guarded reset API is development-only, requires explicit confirmation, captures a backup first, detects concurrent changes, and clears records atomically without deleting the database schema.

## Verification

Run `npm run check:persistence`, `npm run test:persistence`, and `npm run test:stage9`. Real-browser tests use UUID-named fixture databases and temporary browser profiles.
