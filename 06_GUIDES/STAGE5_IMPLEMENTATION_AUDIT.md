# Stage 5 Thinking Stories — Implementation Audit

Status: READY FOR IMPLEMENTATION

This audit is based on the merged `main` baseline after Stage 4. Stage 5 must add Thinking Stories without changing canonical story content or implementing Stage 6+ reward/Boss behavior.

## Authoritative inputs

- `AGENTS.md`
- `02_DATA/thinking_stories_30.json`
- `01_SPECS/UI_UX_IMPLEMENTATION_SPEC.md`
- `01_SPECS/UI_UX_FLOW_SPEC.md`
- `03_REWARDS_BOSSES/BOSSES_6.json`
- `03_REWARDS_BOSSES/REWARD_SYSTEM.json`
- `data/copy/UI_COPY_ZH_TW.json`
- `assets/ASSET_MANIFEST.json`
- `incoming/chatgpt/reports/data-qa/A3_3_STORY_QA_REPORT.md`
- `04_UI_REFERENCES/06_thinking_story.png`

## Baseline findings

### Canonical content

`thinking_stories_30.json` is the canonical source. It contains 30 unique stories with stable IDs `S01`–`S30`. Each story contains:

- `id`
- `title`
- `theme`
- `body`
- exactly 4 `questions`
- 1 `realityTask`
- 1 `takeaway`
- `estimatedMinutes`
- `charCount`

A3-3 QA already passed 42/42 with zero blocking data defects. Do not rewrite or normalize the source JSON merely for runtime convenience.

### Chapter model

Canonical stories do not contain chapter fields. Derive chapter deterministically from the stable story ID:

- S01–S05 → Chapter 1 / 金錢森林 / B01
- S06–S10 → Chapter 2 / 等待之谷 / B02
- S11–S15 → Chapter 3 / 成長山脈 / B03
- S16–S20 → Chapter 4 / 智慧迷宮 / B04
- S21–S25 → Chapter 5 / 時間王國 / B05
- S26–S30 → Chapter 6 / 友情之城 / B06

Use the numeric suffix from `story.id`, never current array index, as the durable basis. Resolve chapter/Boss metadata from `BOSSES_6.json` or one immutable resolver boundary; do not duplicate mutable chapter truth into story content.

### Persistence

The existing IndexedDB schema already contains `storyProgress` keyed by `storyId`. No database-version bump is required for Stage 5 unless implementation uncovers an objective schema limitation.

Use one progress record per story and preserve first-completion idempotency. Rereading is allowed. Double-click, reload, revisit, or reread must not create duplicate completion/reward effects.

Recommended responsibility split:

- story repository: immutable content loading/query
- story progress repository: IndexedDB read/write by stable `storyId`
- story/chapter service: completion and derived chapter progress
- UI: list/chapter grouping/reader only

Chapter progress should be computed from completed `storyProgress` records rather than copied into six independent mutable counters unless a later stage explicitly requires otherwise.

### Rewards boundary

Story JSON has no per-story EXP value. Stage 5 must not invent an EXP amount or directly mutate player EXP. `REWARD_SYSTEM.json` includes story titles/badges and Stage 6 owns reward transactions. Stage 5 should only produce reliable story completion/chapter-progress state that Stage 6/7 can consume.

Likewise, Stage 5 must not implement Boss progress/rewards. It may expose a stable `isChapterComplete(chapter)`/chapter progress API for Stage 7.

### Learn route integration

Stage 4 already owns the `learn` route with a complete English flow. Stage 5 should preserve that behavior and add Thinking Stories under the same Learn area.

Recommended UI integration:

- top-level Learn switcher/entry for `英文學習` and `思維故事`;
- Home English shortcut opens the English surface;
- Home Stories shortcut opens the Stories surface;
- bottom-nav Learn remains one route;
- do not create a sixth bottom-nav item;
- do not regress Stage 4 English state, speech, matching, spelling, or persistence.

### Story UI

Required reader hierarchy from spec/reference:

- chapter
- title
- estimated reading time
- readable body paragraphs, 22–26 px, line-height about 1.65
- all 4 reflection questions
- 1 real-world task
- 1 thought card (`takeaway`)
- completion button/state

Questions are reflection prompts, not scored trivia. Do not create correct/incorrect answers.

`realityTask` is an off-screen real-world action. Present it clearly but do not require extended tablet interaction or parent proof in Stage 5.

The reader must support variable length. S01/S02/S03 exceed the nominal 500–700 character target; do not truncate canonical text.

### Art/fallback

The asset manifest declares 30 logical story-cover slots (`story.S01.cover` … `story.S30.cover`) as pending and provides `pet.fox.reading` as the fallback. Missing story covers are explicitly non-blocking until Stage 10.

Resolve covers through the existing asset registry/fallback contract. Do not invent new production images or hardcode filesystem guesses into Story UI.

### Current code gap

There is currently no dedicated story page/repository/service in `js/pages/` or Stage 5 runtime. Home still shows Stories as a Stage 5-disabled quick card. This is the intended implementation gap.

## Stage 5 acceptance gate

Implementation must prove at minimum:

1. Exactly 30 canonical stories load, stable S01–S30.
2. Chapter resolver yields six groups of five and correct chapter/Boss metadata.
3. Story overview/list is accessible from Learn and Home Stories shortcut.
4. Reader renders full body, four questions, reality task, thought card, and estimated time.
5. Reflection questions are not scored.
6. Completion persists to `storyProgress` and survives reload.
7. Completing the same story repeatedly is idempotent for first-completion/chapter progress.
8. Rereading remains possible.
9. Chapter progress computes 0–5 from story completion records.
10. No per-story EXP or Stage 6/7 reward/Boss logic is invented.
11. Pending story art uses the declared fallback contract.
12. Stage 4 English and Stage 3 quest/persistence regressions remain PASS.
13. Tablet portrait browser smoke covers story list → reader → completion → reload → reread.

## Gate conclusion

Stage 5 is READY. No canonical-data rewrite or IndexedDB migration is required before implementation.
