# Stage 4 English Engine — Implementation Audit

Status: READY FOR IMPLEMENTATION

This audit is based on `AGENTS.md`, the canonical English/vocabulary specs and data, A1 vocabulary fixtures, A3-2 English QA, and the current Stage 0-3 runtime on `main`.

## Source-of-truth inputs

- `01_SPECS/VOCABULARY_EXPANSION_SPEC.md`
- `01_SPECS/vocabulary-pack.schema.json`
- `02_DATA/core300_words_enriched.json` — only canonical Core 300 source
- `02_DATA/ENGLISH_MODULE_SPEC.json`
- `02_DATA/speech_settings.json`
- `06_GUIDES/STAGE4_ENGLISH_ARCHITECTURE_CONSTRAINTS.md`
- `incoming/chatgpt/data/vocabulary-fixtures/`
- `incoming/chatgpt/reports/data-qa/A3_2_ENGLISH_QA_REPORT.md`
- `05_TESTS/ACCEPTANCE_TESTS.md`

## Current repository readiness

1. IndexedDB already has the required stores:
   - `vocabularyPacks` keyed by `packId`
   - `vocabularyWords` keyed by `wordId`
   - `wordProgress` keyed by `wordId`
   - `wordSessions` keyed by `id`

2. Existing indexes already cover the Stage 4 baseline:
   - vocabulary words: `packId`, `category`, `level`
   - word progress: `nextReviewAt`, `state`
   - word sessions: `wordId`, `startedAt`

3. No IndexedDB migration is required for the baseline Stage 4 implementation. Preserve `DB_VERSION = 2` unless a real missing persistence requirement is proven.

4. Global speech rate already exists in the persisted settings preferences with default `0.75`; Stage 4 should reuse this source rather than create a second speech-setting store.

5. The `learn` route already exists, but it currently renders the generic placeholder. Stage 4 should replace only the Learn route with the English learning UI while leaving Story functionality deferred to Stage 5.

6. Traditional-Chinese Learn copy already exists in `data/copy/UI_COPY_ZH_TW.json`, including new words, reviews, speech rate, listening, image choice, spelling, memory matching, and completion states.

7. Home already routes the English quick entry to `learn`; its Stage-4 placeholder description should be updated when the English module becomes live.

## Mandatory architecture decisions

- Never hardcode vocabulary total as 300.
- Load only `core300_words_enriched.json` for Core 300; never also load `core300_words.json`.
- Normalize legacy Core records at the loader boundary:
  - preserve source `id` as `legacyId`
  - assign `packId = core300-zhTW`
  - derive `wordId = core300-zhTW:<legacyId>`
- Do not mutate learning progress fields inside vocabulary content records.
- `WordProgress` is the sole mutable learning-progress record keyed by stable `wordId`.
- Pack enable/disable/import/update must preserve WordProgress and session history.
- Disabling a pack removes it from new scheduling, not from persistent content/history.
- Re-enabling a pack must expose the same stable identities and prior progress.
- Do not deduplicate by Chinese meaning, examples, or translations.
- Review baseline is `[1,3,7,14,30]` days.
- Due reviews are selected before new words.
- Daily new words: 3-5; daily review words: 3-5.
- Mastery states: `unseen -> seen -> known -> practiced -> mastered`.
- Wrong answers must shorten the next review according to the authoritative rule; implementation must be deterministic and tested.
- Speech fallback: `SpeechSynthesis`, locale `en-US`, global rate default `0.75`, range `0.60-1.10`, step `0.05`.
- A supplied `audioFile` wins over SpeechSynthesis.
- Audio playback alone awards no EXP.

## Pack/import boundary

A1 mock packs are test fixtures, not production lessons.

Stage 4 import validation must reject malformed/schema-invalid/duplicate/conflicting data atomically and preserve installed content/progress. Expected invalid-fixture error classes are documented in `fixture_manifest.json`.

The implementation should remain data-driven. If a runtime vocabulary index is introduced, it should reference the canonical Core source rather than copy/rewrite the 300 records into a second production vocabulary file.

## Required Stage 4 regression gate

The implementation is not complete until automated/browser tests demonstrate:

1. Core 300 loads.
2. Progress is created for at least 10 Core words.
3. Mock +300 imports successfully and enabled total becomes 600.
4. Original 10 WordProgress records remain unchanged.
5. Mock +200 imports successfully and enabled total becomes 800.
6. New words can be scheduled without source-code changes.
7. Disabling an expansion pack removes it from new scheduling but preserves history/progress.
8. Re-enabling restores the same progress.
9. No `TOTAL_WORDS = 300`-style hardcode exists.
10. Speech quick rates 0.60/0.75/0.90/1.00/1.10 work for words and examples; reload preserves the chosen rate.
11. Existing Stage 0-3 persistence, quest, approval, backup, and no-double-EXP regressions remain green.

## Scope boundary

Stage 4 may add the English repositories/services/page/UI and minimal pack-management/import surfaces required by the vocabulary specification. Do not implement Stage 5 Story Engine, Stage 6 Reward Engine, or Stage 7 official Boss Engine as part of this change.
