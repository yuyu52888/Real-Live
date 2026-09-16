# Real Life Quest｜A3-2 English QA Report v1.0

**Result: PASS**  
**Checks: 37/37 PASS**  
**Blocking errors: 0**

## QA scope

- `02_DATA/core300_words_enriched.json` (canonical Core 300)
- `02_DATA/core300_words.json` (duplicate/legacy comparison)
- `02_DATA/ENGLISH_MODULE_SPEC.json`
- `02_DATA/speech_settings.json`
- `01_SPECS/VOCABULARY_EXPANSION_SPEC.md`
- `01_SPECS/vocabulary-pack.schema.json`
- A1 mock +300 / +200 packs and fixture manifest

## Summary

- Core words: **300 / 300**
- Unique IDs: **300 / 300**
- Unique words: **300 / 300**
- Levels: **A 100 / B 100 / C 100**
- Spelling targets: **180 / 180**
- Every example contains its target word: **PASS**
- Every example/exampleZh pair is complete: **PASS**
- Review intervals `[1,3,7,14,30]`: **300 / 300**
- Speech metadata: **300 / 300 consistent**
- A1 mock expansion packs: **300 + 200, schema-valid**
- Global transformed IDs across 300 + 300 + 200: **800 unique**
- Required Stage 4 count transition: **300 → 600 → 800 PASS**

## Check results

| # | Check | Result | Detail |
|---:|---|:---:|---|
| 1 | Canonical Core 300 count | PASS | count=300 |
| 2 | Legacy duplicate file count | PASS | count=300 |
| 3 | core300_words.json and core300_words_enriched.json content-identical | PASS | Both files contain the same 300 records. PROJECT_MANIFEST selects core300_words_enriched.json as canonical; do not import both. |
| 4 | Core IDs unique | PASS | unique=300 |
| 5 | Core IDs sequential W001-W300 | PASS |  |
| 6 | Core English words unique case-insensitively | PASS |  |
| 7 | Core required fields present | PASS |  |
| 8 | Core text fields nonblank | PASS |  |
| 9 | All examples contain target word | PASS |  |
| 10 | Example / exampleZh paired | PASS |  |
| 11 | Level distribution A/B/C = 100/100/100 | PASS | Counter({'A': 100, 'B': 100, 'C': 100}) |
| 12 | Difficulty maps A=1, B=2, C=3 | PASS |  |
| 13 | Spelling target count = 180 | PASS |  |
| 14 | Spelling targets are Level A all + first 80 Level B | PASS |  |
| 15 | Initial mastery = unseen for all 300 | PASS |  |
| 16 | Embedded counters initialized to zero | PASS |  |
| 17 | Embedded review timestamps initialized null | PASS |  |
| 18 | Review schedule = [1,3,7,14,30] for all 300 | PASS |  |
| 19 | Audio locale = en-US for all 300 | PASS |  |
| 20 | No bundled audio files required at baseline | PASS |  |
| 21 | Per-word speech metadata consistent | PASS |  |
| 22 | Global speech default/range/step correct | PASS |  |
| 23 | Speech quick rates correct | PASS |  |
| 24 | Speech setting persists and parent lock supported | PASS |  |
| 25 | English module daily new words = 3-5 | PASS |  |
| 26 | English module daily review words = 3-5 | PASS |  |
| 27 | Mastery state sequence correct | PASS |  |
| 28 | Audio playback alone awards 0 EXP | PASS |  |
| 29 | Five required game modes present | PASS |  |
| 30 | A1 mock +300 pack schema-valid | PASS | valid against vocabulary-pack.schema.json |
| 31 | A1 mock +200 pack schema-valid | PASS | valid against vocabulary-pack.schema.json |
| 32 | A1 mock expansion counts 300 + 200 | PASS |  |
| 33 | A1 pack IDs are distinct | PASS |  |
| 34 | Global word IDs unique across Core300 + A1 300 + A1 200 | PASS |  |
| 35 | Stage 4 total scenario computes 300 -> 600 -> 800 | PASS |  |
| 36 | Fixture manifest reserves canonical core packId | PASS |  |
| 37 | A1 invalid fixture set present | PASS | invalidFixtures=8 |

## Non-blocking integration advisories

### ENG-ARCH-001 — Canonical Core 300 is a legacy flat list, not a VocabularyPack wrapper

Stage 4 loader should transform id -> legacyId, generate stable wordId core300-zhTW:Wxxx, set packId=core300-zhTW, and wrap the 300 records as the builtin pack. Do not require source data to already have the future pack shape.

### ENG-ARCH-002 — Legacy Core records embed progress-like fields

mastery/correctCount/wrongCount/lastReview/nextReview exist in the source records only as initialized legacy fields. Target architecture requires WordProgress to be separate. Stage 4 must not persist or update learning progress inside vocabularyWords content records.

### ENG-DATA-003 — Two Core 300 JSON files are identical; import only the canonical one

core300_words.json and core300_words_enriched.json are content-identical. PROJECT_MANIFEST declares core300_words_enriched.json canonical. Loading both would double-process the same content even if wordId de-duplication later hides it.

### ENG-SPEECH-004 — Speech applyTo naming differs between two spec files

ENGLISH_MODULE_SPEC uses ['word', 'exampleSentence', 'listeningQuiz']; speech_settings.json uses ['word', 'example', 'listeningQuiz']. Treat these as descriptive labels, not separate feature flags. Runtime speech service should expose one shared setting to word, example sentence, and listening quiz modes.

### ENG-CONTENT-005 — Small number of intentional semantic/example duplicates

Duplicate Chinese meanings: 3 groups; duplicate English example sentences: 2 groups; duplicate Chinese example translations: 3 groups. These are not invalid because different target words can share meanings/context. Do not auto-deduplicate content by meaning or sentence text.

## Important Stage 4 rules derived from QA

- Use `core300_words_enriched.json` as the **only canonical Core 300 source**.
- Convert each legacy `id` to stable `wordId = core300-zhTW:<legacyId>`; preserve original `id` as `legacyId` if desired.
- Store vocabulary content and `WordProgress` separately. Do not update `mastery`, counters, or review dates inside the vocabulary content record.
- Do not hardcode total `300`; enabled-word totals must be repository-derived.
- A1 +300 and +200 packs are test fixtures only. They verify architecture; they are not production vocabulary content.
- Pack disable must stop new scheduling from that pack without deleting history/progress.
- Pack re-enable must restore access to existing progress.
- Speech rate is one global setting shared by word, example sentence, and listening modes.
- Do not auto-deduplicate words based on Chinese meaning or example sentence text; stable `wordId` is the identity key.

## Duplicate content observations (valid, no automatic correction)

### Chinese meanings
- `爸爸` → W014 father, W016 dad
- `媽媽` → W015 mother, W017 mom
- `說` → W088 speak, W207 say

### English examples
- `My family eats dinner together.` → W023 family, W118 dinner
- `Please sit here.` → W199 sit, W270 here

### Chinese example translations
- `我的家人一起吃晚餐。` → W023 family, W118 dinner
- `這朵花很漂亮。` → W134 flower, W249 beautiful
- `請坐這裡。` → W199 sit, W270 here

## Gate recommendation

**Stage 4 English Engine may proceed.** There are no blocking data defects in the canonical Core 300 or A1 legal expansion fixtures. The five advisories above should be treated as implementation constraints during Stage 4, not as requests to rewrite the source vocabulary JSON.
