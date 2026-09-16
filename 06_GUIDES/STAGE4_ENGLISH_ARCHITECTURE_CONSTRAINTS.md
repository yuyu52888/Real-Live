# Stage 4 English architecture constraints

This preparation note records the A1 vocabulary-fixture and A3-2 English QA
findings. It does not implement Stage 4 runtime behavior.

## Canonical source and loader boundary

- `02_DATA/core300_words_enriched.json` is the only canonical Core 300 source.
- Core 300 is pack 1 (`core300-zhTW`), not a system limit.
- The canonical flat list must not be rewritten solely to resemble a future
  `VocabularyPack` wrapper.
- A future loader may normalize a Core record at its boundary by preserving the
  source `id` as `legacyId`, assigning `packId = core300-zhTW`, and deriving the
  stable global identity `wordId = core300-zhTW:<legacyId>`.
- Do not also load the content-identical legacy `core300_words.json`.

## Dynamic packs and progress isolation

- Vocabulary totals must be derived dynamically from enabled packs; never use
  `TOTAL_WORDS = 300` or an equivalent limit.
- Vocabulary content and `WordProgress` are separate records. Legacy initialized
  mastery, counters, and review timestamps in Core content are not mutable
  progress storage.
- Pack import, update, enable, and disable must not erase or overwrite existing
  `WordProgress`, session history, or other child data.
- Disabling a pack removes it from new scheduling only. Re-enabling it restores
  access to the same stable word identities and existing progress.
- Identity is always stable `wordId`; never use an array index, meaning,
  translation, example text, or other mutable/display content as identity.
- Intentional duplicate meanings and example sentences remain valid content and
  must not be automatically deduplicated.

## Scheduling and speech baselines

- The review schedule baseline is `[1, 3, 7, 14, 30]` days.
- Due reviews are prioritized before new words; daily counts remain dynamic and
  bounded by the authoritative English specification.
- SpeechSynthesis fallback defaults to locale `en-US` and rate `0.75x`.
- The supported speech range is `0.60x` through `1.10x` in `0.05x` steps.
- One persisted global rate applies to word, example-sentence, and listening
  modes. `exampleSentence` and `example` in the two source specs describe the
  same application surface, not separate settings.
- A supplied audio file takes precedence over SpeechSynthesis.

## A1 fixture boundaries

- `mock_expansion_300.json`, `mock_expansion_200.json`, and
  `valid_minimal_pack_2.json` are valid test fixtures, not production lessons.
- Core + mock 300 + mock 200 must produce 800 globally unique stable word IDs.
- All `invalid_*.json` files remain rejection fixtures only. They must never be
  imported into canonical content or exposed as child learning material.
- Rejection of malformed, unsupported, schema-invalid, duplicate-pack, or
  duplicate-word data must be atomic and must preserve installed content and
  progress when Stage 4 import behavior is implemented.

No IndexedDB schema or migration change is authorized by this preparation step.
