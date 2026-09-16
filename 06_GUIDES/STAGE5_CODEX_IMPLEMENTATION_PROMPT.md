# Stage 5 Codex Implementation Prompt

Read `AGENTS.md` first.
Work only on branch `stage5-stories`.
Do not merge to `main`.

Stage 0–4 are complete and merged. Stage 5 audit is complete. Do not redo prior content QA, do not rewrite canonical JSON, and do not implement Stage 6+ rewards/Boss logic.

Authoritative Stage 5 inputs:
- `06_GUIDES/STAGE5_IMPLEMENTATION_AUDIT.md`
- `02_DATA/thinking_stories_30.json`
- `01_SPECS/UI_UX_IMPLEMENTATION_SPEC.md`
- `01_SPECS/UI_UX_FLOW_SPEC.md`
- `03_REWARDS_BOSSES/BOSSES_6.json`
- relevant `data/copy/UI_COPY_ZH_TW.json`
- `assets/ASSET_MANIFEST.json`
- `incoming/chatgpt/reports/data-qa/A3_3_STORY_QA_REPORT.md`
- UI reference `04_UI_REFERENCES/06_thinking_story.png`

Read only files necessary for this task. Preserve Stage 3/4 behavior and unrelated files.

## Implement Stage 5 Thinking Stories

### 1. Canonical story repository

Load only `02_DATA/thinking_stories_30.json` as canonical story content.

Requirements:
- validate/load 30 stories;
- use stable `story.id` (`S01`–`S30`) as identity;
- provide list/get APIs;
- never persist by current array index;
- do not mutate/rewrite story content at runtime;
- preserve full body text, including long S01/S02/S03.

### 2. Chapter resolver

Derive chapter from the numeric suffix of stable `story.id`, five stories per chapter.
Resolve chapter name/Boss metadata from `03_REWARDS_BOSSES/BOSSES_6.json` or a single immutable resolver boundary.

Required mapping:
- S01–S05 → chapter 1 / 金錢森林 / B01
- S06–S10 → chapter 2 / 等待之谷 / B02
- S11–S15 → chapter 3 / 成長山脈 / B03
- S16–S20 → chapter 4 / 智慧迷宮 / B04
- S21–S25 → chapter 5 / 時間王國 / B05
- S26–S30 → chapter 6 / 友情之城 / B06

Expose enough derived API for later Stage 7, for example chapter metadata and `completed / 5` or `isChapterComplete`, without implementing Boss state.

### 3. Story progress repository

Use the existing IndexedDB `storyProgress` store keyed by `storyId`.
Do not add another persistence system.
Do not increment DB version unless objectively required.

Implement focused APIs for:
- get one story progress;
- list story progress;
- mark first completion idempotently;
- preserve first completion timestamp on repeated completion;
- allow rereading/revisiting without duplicating first-completion effects;
- derive chapter progress from completed story IDs.

A single persistent record per stable `storyId` is preferred.

### 4. Completion semantics

Story completion must be safe under:
- button double-click;
- reload;
- revisiting completed story;
- rereading and pressing complete again.

First completion changes chapter progress once. Repeated completion must not create duplicate records or increment chapter count past 5.

Do NOT award story EXP in Stage 5. Canonical story data has no per-story EXP value and reward transactions belong to Stage 6.
Do NOT write Boss progress/rewards in Stage 5.

### 5. Learn integration

Preserve the existing Stage 4 English engine completely.
The bottom navigation remains exactly five items.

Add Thinking Stories inside the existing `learn` route using a simple child-friendly switcher/entry such as:
- 英文學習
- 思維故事

Requirements:
- bottom-nav Learn remains one route;
- Home English shortcut opens the English surface;
- Home Stories shortcut opens the Stories surface;
- switching between English and Stories must not reset English IndexedDB progress/session data;
- do not add a sixth bottom-nav item.

You may refactor `learn.js` only as much as necessary to support both surfaces cleanly. Avoid broad unrelated redesign.

### 6. Story overview/list

Implement a story overview that shows all 30 stories grouped or filterable by six chapters.
Each story card should expose at minimum:
- title;
- theme or brief secondary text;
- chapter;
- estimated minutes;
- completion state;
- cover/fallback;
- open/read action.

Show chapter progress such as `3 / 5`.
Completed stories remain readable.

### 7. Story reader

Follow the Stage 5 spec and UI reference hierarchy.

Header:
- chapter / chapter name;
- title;
- estimated reading time.

Reader:
- render body with original paragraph breaks;
- child reading text about 22–26 px;
- line-height about 1.65;
- scroll naturally; never truncate canonical body.

After body:
- `想一想`: exactly four reflection questions;
- explain that there is no standard answer;
- do not score questions or require a correct response;
- `今日現實任務`: one `realityTask`;
- `今日思維卡`: one `takeaway`;
- `完成閱讀` action.

Completion state should acknowledge success and show current chapter progress. Keep the real-world task off-screen oriented; do not add lengthy forms, quizzes, or proof requirements.

### 8. Art fallback

Use the existing asset-registry/manifest contract.
Logical story cover IDs are `story.<storyId>.cover` (for example `story.S01.cover`).
All 30 production story covers may still be pending.
Use the declared `pet.fox.reading` fallback when the story cover is unavailable.

Do not hardcode speculative image file paths or create production artwork in this task.

### 9. Home integration

Enable the existing Home `思維故事` quick card and route it directly to the Stories surface under Learn.
Remove Stage 5 unavailable copy.
Keep English quick entry routed to English.

### 10. Required tests

Add focused Stage 5 tests proving at minimum:

1. canonical load count = 30;
2. IDs S01–S30 unique/stable;
3. every story has exactly 4 questions, a reality task, takeaway, estimated time;
4. chapter resolver = six groups × five with correct Boss/chapter metadata;
5. chapter resolution uses story ID semantics, not persistent array index;
6. full story content is rendered and long S01 is not truncated;
7. reader renders all 4 reflection prompts, reality task and thought card;
8. story questions are not scored as correct/incorrect;
9. first completion creates one `storyProgress` record;
10. double/repeated completion remains one record and chapter progress increases only once;
11. completion survives reload;
12. completed story can be reopened/reread;
13. five completed stories produce chapter progress `5 / 5` and `isChapterComplete=true`;
14. no player EXP/reward/Boss progress is changed by Stage 5 story completion;
15. missing cover resolves to declared fallback;
16. Home Stories quick entry opens Stories; English entry still opens English;
17. Stage 4 English tests remain PASS;
18. Stage 3/A7/persistence regressions remain PASS.

### 11. Browser smoke

At minimum at 768×1024:
- onboarding/reload baseline still works;
- Home → 思維故事;
- Story overview appears;
- open S01;
- verify title, estimated time, readable full reader, 4 questions, real-world task and thought card;
- complete S01;
- verify chapter progress = 1/5;
- reload;
- verify S01 remains completed;
- reopen S01 and complete again;
- verify chapter progress remains 1/5 and one persistent record;
- navigate back to English and verify Stage 4 English overview/modes remain operational;
- no console/page errors.

### 12. Verification

Run at minimum:
- `npm run validate:content`
- existing Stage 4 tests
- Stage 5 targeted Node tests you add
- existing Stage 3/A7 regression
- persistence/browser regression
- tablet portrait browser smoke 768×1024
- `git diff --check`

Preserve all existing user data.
Do not reset/recreate IndexedDB.
Do not modify canonical stories simply to fit UI.
Do not implement Stage 6 rewards or Stage 7 Boss behavior.
Do not merge to main.

## Git delivery

Commit all Stage 5 implementation changes to `stage5-stories` and push to GitHub.

Reply only with:
- Files changed
- Implemented
- Stage 5 targeted tests/results
- Existing regression results
- Browser smoke result
- Commit SHA
- Push result
- Remaining limitations
