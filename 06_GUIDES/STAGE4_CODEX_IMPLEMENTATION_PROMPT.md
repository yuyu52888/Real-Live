# Stage 4 Codex Implementation Prompt

Read `AGENTS.md` first.
Work only on branch `stage4-english`.

Stage 0–3 and A7 are complete and must remain intact. Stage 4 preparation/audit is complete. Do not redo content QA or architecture review.

Authoritative Stage 4 inputs:
- `01_SPECS/VOCABULARY_EXPANSION_SPEC.md`
- `01_SPECS/vocabulary-pack.schema.json`
- `02_DATA/core300_words_enriched.json`
- `02_DATA/ENGLISH_MODULE_SPEC.json`
- `02_DATA/speech_settings.json`
- `06_GUIDES/STAGE4_ENGLISH_ARCHITECTURE_CONSTRAINTS.md`
- `06_GUIDES/STAGE4_IMPLEMENTATION_AUDIT.md`
- `incoming/chatgpt/data/vocabulary-fixtures/`
- `incoming/chatgpt/reports/data-qa/A3_2_ENGLISH_QA_REPORT.md`
- relevant `data/copy/UI_COPY_ZH_TW.json` learn copy
- relevant UI reference: `04_UI_REFERENCES/03_english_learning.png`

Do not inspect or implement Stage 5+ content.

## Implement Stage 4 English Engine

### 1. Vocabulary loading and normalization
- Load only canonical `02_DATA/core300_words_enriched.json` for Core 300.
- Normalize at loader boundary into pack `core300-zhTW`.
- Preserve source `id` as `legacyId`.
- Generate stable `wordId = core300-zhTW:<legacyId>`.
- Do not load duplicate legacy `core300_words.json`.
- No hardcoded system total of 300.

### 2. Vocabulary repositories
Use existing IndexedDB stores; do not create a second persistence system:
- `vocabularyPacks`
- `vocabularyWords`
- `wordProgress`
- `wordSessions`

Implement focused repository APIs for:
- install/update validated pack content;
- count enabled words dynamically;
- list/get words by stable `wordId`;
- enable/disable pack without deleting progress/history;
- read/write WordProgress separately from vocabulary content;
- due review queries;
- session persistence as needed.

Do not increment DB version unless the existing schema objectively cannot support the implementation. Existing Stage 2 schema already contains the stores/indexes required for Stage 4.

### 3. Pack validation/import service
Implement atomic validation/import behavior compatible with A1 fixtures.
Reject all declared invalid fixtures with stable error codes matching the fixture manifest where practical:
- duplicate wordId;
- missing required field;
- packId mismatch;
- installed packId conflict;
- broken example/exampleZh pair;
- invalid review schedule;
- unsupported schema version;
- malformed JSON.

Failure must not partially mutate installed content, progress, or child data.
A1 mock packs remain test fixtures, not production lessons.

### 4. Progress model
WordProgress is separate from vocabulary content.
Use stable `wordId` only.
States:
`unseen -> seen -> known -> practiced -> mastered`

Track at minimum:
- correctCount
- wrongCount
- streak
- lastSeenAt
- lastReviewAt
- nextReviewAt
- spellingUnlocked where applicable

Never mutate legacy mastery/counter/timestamp fields inside vocabulary content as runtime progress.

### 5. Review scheduler
- Baseline intervals: 1 / 3 / 7 / 14 / 30 days.
- Due reviews before new words.
- Daily new words: 3–5.
- Daily review words: 3–5.
- Wrong answer must shorten the next review interval to later today or next day per authoritative spec.
- Scheduling is by `wordId`, not by array position or mutable text.
- Disabled packs must stop supplying new learning items; existing progress/history remains.

### 6. Speech service
Reuse existing persisted global `speechRate`; do not create a second setting store.
- locale default: en-US
- default: 0.75
- range: 0.60–1.10
- step: 0.05
- quick rates: 0.60 / 0.75 / 0.90 / 1.00 / 1.10
- audio file wins if present; otherwise SpeechSynthesis fallback
- one shared setting applies to word, example sentence, and listening mode
- audio playback alone awards 0 EXP
- handle unavailable SpeechSynthesis gracefully

### 7. Learn / English UI
Replace the current `learn` placeholder with Stage 4 English UI only.
Stories remain deferred to Stage 5.
Use existing app shell, reusable components, A4 copy service, CSS tokens, and the English UI reference for hierarchy/composition.

Minimum child flow:
- English overview/progress
- today due reviews first
- new words after due reviews
- word card with English, Chinese meaning, example/exampleZh, image cue/fallback, pronunciation controls
- answer/knowledge actions that update progress
- session completion state
- dynamic totals, never fixed 300

Implement the required Stage 4 modes that are reasonable within current assets/data:
- 中文找英文
- 英文找圖片 / image-cue fallback
- 聽音找字
- 記憶翻牌 / matching
- spelling challenge only when `spellingRequired` and sufficiently unlocked/practiced

Do not invent production word artwork if absent; use declared/friendly fallback behavior.

### 8. Home integration
Update Home English shortcut copy/state so it no longer says Stage 4 is unavailable.
Do not implement Stories, Rewards, Boss, or Stage 5+ business logic.

### 9. Mandatory Stage 4 regression
Automate this exact architecture scenario using A1 fixtures:
1. Load Core 300.
2. Create/persist progress for at least 10 Core words.
3. Import mock +300 pack -> enabled total 600.
4. Verify original 10 WordProgress records unchanged.
5. New expansion words can be scheduled.
6. Import mock +200 pack -> enabled total 800.
7. Disable one expansion pack -> disabled pack supplies no new learning items; progress/history retained.
8. Re-enable -> same progress returns.
9. No UI/source-code change between 300 / 600 / 800 scenarios.
10. Reload persistence remains valid.

Also test:
- invalid imports are atomic and non-destructive;
- duplicate wordId protection;
- speechRate persistence and boundaries;
- due review priority;
- wrong-answer rescheduling;
- audio button gives 0 EXP;
- legacy duplicate Core JSON is not double-loaded.

### 10. Verification
Run at minimum:
- `npm run validate:content`
- `npm run test:stage4-prep`
- Stage 4 targeted Node tests you add
- existing Stage 3/A7 regression
- persistence regression
- browser smoke at tablet portrait 768x1024 minimum
- speech behavior in a supported browser where practical
- `git diff --check`

Preserve all unrelated/untracked files and existing user data.
Do not reset/recreate IndexedDB.
Do not modify canonical Core 300 just to fit the runtime wrapper.
Do not merge to main.

## Git delivery
Commit all Stage 4 implementation changes to branch `stage4-english` and push to GitHub.
Do not merge.

Reply only with:
- Files changed
- Implemented
- Stage 4 targeted tests/results
- Existing regression results
- Browser/speech smoke result
- Commit SHA
- Push result
- Remaining limitations
