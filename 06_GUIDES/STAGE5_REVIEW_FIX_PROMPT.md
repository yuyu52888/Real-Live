# Stage 5 Review Fix Prompt

Read `AGENTS.md` first. Work only on branch `stage5-stories`.
Do not merge to `main`.

The Stage 5 implementation commit `261887b0b3a1e9a27b27faaa7d35719b28f10c2c` passed its reported tests, but GitHub source review found two small Stage 5 acceptance gaps in the Story Reader. Fix only these gaps and add targeted regression coverage. Do not redo Stage 5, do not refactor unrelated code, and do not implement Stage 6+.

## Gap 1 — Story Reader header is missing the canonical chapter name

Current `js/pages/stories.js` renders the reader header as:
- chapter number
- estimated minutes
- story title
- story theme

The Stage 5 requirement is:
- chapter number **and canonical chapter name**
- title
- estimated reading time

Required fix:
- Resolve the current story's chapter through the existing `ui.chapters` / `chapterNumberForStory()` boundary.
- Show the canonical chapter name from the already-derived chapter metadata (for example `第 1 章 · 金錢森林`).
- Do not duplicate/hardcode a six-chapter name map inside the page.
- Keep the story theme as secondary text if desired.

## Gap 2 — Completion state does not show current chapter progress inside the reader

The implementation prompt requires the completion state to acknowledge success **and show current chapter progress**.

Current behavior:
- after completing S01, the reader shows a completed note;
- `1 / 5` is only visible after returning to the overview.

Required fix:
- In the reader, derive chapter progress from `ui.progress` using the existing `chapterProgress()` helper.
- After completion, show current progress such as `本章進度 1 / 5` (or equivalent child-friendly wording) without requiring the user to leave the reader.
- When the fifth story in the chapter is complete, the reader should accurately reflect `5 / 5` / chapter complete state.
- Repeated completion must remain idempotent and must never increment beyond 5.
- Do not add EXP, reward, badge, or Boss writes.

## Required targeted tests

Add/extend tests to prove:
1. S01 reader header contains canonical chapter name `金錢森林` resolved from chapter metadata.
2. A completed S01 reader with one progress record shows `1 / 5`.
3. Five completed chapter-1 stories show `5 / 5` / complete state.
4. Browser smoke verifies that immediately after clicking `完成閱讀` for S01, the reader itself shows chapter progress `1 / 5` before navigating back.
5. Existing reload/reread idempotency remains PASS.
6. Stage 4 English, Stage 3/A7, persistence, and content validation remain PASS.

## Scope restrictions

Do not modify:
- `02_DATA/thinking_stories_30.json`
- IndexedDB schema/version
- EXP / Reward / Boss logic
- Stage 4 English behavior
- unrelated UI

Do not perform a broad copy/i18n or visual refactor in this patch.

## Verification

Run the narrow Stage 5 test first, then the existing browser regression if the narrow test passes:
- `npm run test:stage5`
- `npm test`
- `npm run validate:content`
- `git diff --check`

Commit and push normally to `origin/stage5-stories`. Do not force push and do not merge `main`.

Reply only with:
- files changed
- fixes implemented
- tests/results
- commit SHA
- push PASS/FAIL
- remaining limitations
