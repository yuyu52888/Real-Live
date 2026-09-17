# Stage 7 Codex Implementation Prompt

Read `AGENTS.md` first.
Work only on branch `stage7-boss`.
Do not merge `main`.

Stage 0–6 are complete and merged. A6 production art is fully integrated: `assets/ASSET_MANIFEST.json` has 167 ready / 0 pending. Stage 7 audit is complete. Do not redo prior QA, do not rewrite canonical JSON, do not change IndexedDB schema, and do not implement Stage 8+ parent settings/reporting, Stage 9 offline/backup UI, or Stage 10 broad visual-polish/equipment-overlay work.

Read only what is needed, starting with:

- `06_GUIDES/STAGE7_IMPLEMENTATION_AUDIT.md`
- `03_REWARDS_BOSSES/BOSSES_6.json`
- `03_REWARDS_BOSSES/REWARD_SYSTEM.json`
- `js/services/story-chapters.js`
- `js/services/story-service.js`
- `js/repositories/story-progress.js`
- `js/services/reward-service.js`
- `js/services/reward-system.js`
- `js/repositories/rewards.js`
- `js/services/asset-registry.js`
- `assets/ASSET_MANIFEST.json`
- `js/core/db-schema.js`
- `js/app.js`
- `js/pages/home.js`
- `js/pages/hero.js`
- `js/ui/app-shell.js`
- `05_TESTS/ACCEPTANCE_TESTS.md`

Preserve Stage 3/4/5/6 behavior and unrelated files.

## Implement Stage 7 Boss System

### 1. Canonical Boss repository

Load `03_REWARDS_BOSSES/BOSSES_6.json` as the only Boss content source.

Provide focused APIs for:
- list Bosses;
- get Boss by stable B01–B06 ID;
- validate six unique canonical IDs/chapters;
- ensure HP equals canonical progress-step count and step numbers are contiguous.

Do not duplicate Boss story/challenge/reward strings in UI code.

### 2. Boss unlock derivation

Use stable StoryProgress IDs and the existing chapter resolver.

Unlock rule:
- B01 requires S01–S05 complete;
- B02 requires S06–S10 complete;
- B03 requires S11–S15 complete;
- B04 requires S16–S20 complete;
- B05 requires S21–S25 complete;
- B06 requires S26–S30 complete.

Requirements:
- derive availability; do not persist stale lock truth;
- do not use story array indexes;
- do not gate existing story chapters;
- prior Boss defeat cannot bypass next chapter story requirement.

Expose a Boss dashboard model with story prerequisite count, unlock state, progress, defeated state, reward state.

### 3. BossProgress repository

Use existing IndexedDB `bossProgress` keyed by `bossId`.

Do not change DB version/migrations.

Persist at least:
- `bossId`
- `completedSteps` as canonical numeric IDs
- `startedAt`
- `updatedAt`
- `defeatedAt`
- `rewardsGrantedAt`

Do not persist mutable copies of canonical HP/challenge/reward text.

### 4. Step completion rules

Implement a focused BossService operation.

Rules:
- Boss must be unlocked;
- step must exist;
- only next incomplete canonical step may complete;
- already-completed step is idempotent no-op;
- future out-of-order step is rejected;
- reload preserves progress;
- first step sets `startedAt`;
- final step sets `defeatedAt` exactly once;
- no failure penalty/counter.

### 5. Challenge prose is display-only

Do not parse `一週`, `三天`, `10分鐘`, B05 `今日Boss`, or similar text into timers, deadlines, jobs, or hidden logic.

### 6. Parent-confirmation boundary

Canonical Boss data has no structured approval flag.

Stage 7:
- self-records Boss steps;
- does not infer parent confirmation from text;
- does not require PIN;
- does not create Stage 8 approval rows.

### 7. Boss victory EXP

Grant canonical Boss EXP exactly once via `transactions` using:

`boss-exp:<bossId>`

Requirements:
- preserve lifetime EXP;
- duplicate finalize/reload/concurrent calls do not pay twice;
- recalculate level/next target through Stage 6 logic;
- no EXP loss on incomplete attempts.

### 8. Boss rewards — implement both chest paths

Each first Boss victory grants exactly once:

1. Boss EXP;
2. chapter badge;
3. Boss cosmetic;
4. 5 Boss-win fragments → normal chest path;
5. explicit chapter chest.

Do not collapse the two chest paths.

#### Chapter badge mapping
- B01 → `badge_story_ch1`
- B02 → `badge_story_ch2`
- B03 → `badge_story_ch3`
- B04 → `badge_story_ch4`
- B05 → `badge_story_ch5`
- B06 → `badge_story_ch6`

Grant through `grantInventoryReward()` with distinct source, e.g. `sourceType: "boss-badge"`, `sourceId: boss.id`, category badge.

Existing ownership remains quantity 1.

#### Boss cosmetic mapping
Use stable item IDs:
- `boss_b01` … `boss_b06`

Logical asset IDs:
- `cosmetic.boss_b01` … `cosmetic.boss_b06`

Use separate source type such as `boss-cosmetic`.

#### Boss-win fragments
Use Stage 6 `grantChestFragments()` with:
- `sourceType: "boss-win"`
- `sourceId: boss.id`
- `amount: 5`

This should trigger the existing normal chest conversion exactly once.

#### Explicit chapter chest
Use Stage 6 `grantChest()` with:
- `sourceType: "boss-chapter"`
- `sourceId: boss.id`
- `chestType: "chapter"`
- `poolType: "boss"`

Outcome freezes at grant time and survives reload without reroll.

### 9. Boss-specific achievements

Implement only:
- first distinct Boss defeated → `badge_first_boss` once;
- five distinct Bosses defeated → title `boss_5` / `Boss Slayer` once.

Do not unlock unrelated retry/streak/focus/self-start achievements.

### 10. Interrupted victory recovery

Required flow:
1. persist final step + `defeatedAt`;
2. grant EXP idempotently;
3. grant chapter badge;
4. grant Boss cosmetic;
5. grant 5 fragments;
6. grant chapter chest;
7. grant Boss achievements if eligible;
8. set `rewardsGrantedAt` only after all required operations succeed.

On startup/Boss synchronization, retry any defeated Boss lacking `rewardsGrantedAt`. Already-granted components must no-op.

### 11. Boss dashboard/current selection

Return all six Bosses with:
- canonical data;
- story prerequisite `completed / 5`;
- unlocked state;
- step/HP progress;
- in-progress/defeated state;
- reward-grant completion state.

Home selection:
- lowest chapter unlocked + undefeated Boss;
- otherwise lowest chapter undefeated Boss as locked preview;
- if all six defeated, show completion state.

### 12. Production Boss art — use it now

A6 is fully integrated. Do not deliberately use the old placeholder path when production art resolves.

Use AssetRegistry logical IDs:
- `boss.B01` … `boss.B06`
- `cosmetic.boss_b01` … `cosmetic.boss_b06`

Requirements:
- Boss view renders the resolved production image;
- fallback remains defensive only if resolution fails;
- business logic must not depend on raw filenames;
- do not hardcode canonical asset paths in Boss reward/service logic.

### 13. Boss UI without sixth nav item

Keep bottom nav exactly:
- Home
- Quests
- Learn
- Hero
- Parent

Use internal Boss subview/state from Home.

Boss view must show:
- production Boss illustration;
- chapter + Boss name;
- canonical story/description;
- canonical challenge;
- HP/progress bar;
- 3–5 canonical progress steps;
- completed/current/locked states;
- only next incomplete step active;
- reward preview: EXP, badge, chapter chest, Boss cosmetic, 5 fragments;
- Back/Home CTA.

Locked view shows five-story prerequisite and `x / 5`.
Defeated view shows child-friendly victory state and granted reward summary.

### 14. Chapter chest opening

After victory, surface explicit chapter chest if unopened.

Use Stage 6 `openChest()`.
Do not reroll.
Double-open/reload must not duplicate outcome.

Normal fragment chest may remain in Hero inventory.

### 15. Home integration

Replace Stage 6 Boss placeholder with real Boss model:
- chapter/name;
- status;
- story progress if locked;
- HP/steps if unlocked/in progress;
- CTA;
- all-complete state after six defeated.

### 16. Refresh boundaries

After Boss state/reward changes:
- refresh player EXP/level;
- refresh Hero rewards/chests/titles/badges;
- refresh Boss dashboard;
- render Home/Hero consistently.

Do not rescan full reward state on every inert Boss render.

## Required targeted tests

Add Stage 7 tests proving at minimum:

1. canonical six Bosses load B01–B06 with chapters 1–6;
2. HP equals canonical step count and steps are contiguous;
3. unlock uses stable story IDs;
4. B01 locked at 4/5 and unlocked at 5/5;
5. B02 independently requires S06–S10;
6. locked Boss cannot record progress;
7. step order enforced;
8. duplicate step completion idempotent;
9. Boss progress survives reload;
10. final step sets `defeatedAt` once;
11. `boss-exp:<bossId>` pays canonical EXP once;
12. level normalization after Boss EXP correct;
13. chapter badge stable ID and single ownership;
14. cosmetic uses `boss_b0N` stable item ID;
15. Boss victory grants exactly 5 fragments once;
16. fragments create one normal chest exactly once;
17. explicit chapter chest also granted once;
18. chapter chest uses `chestType="chapter"` and frozen `bossChestPool` outcome;
19. reload/retry creates no extra chest/reroll;
20. chapter chest open idempotent;
21. first Boss grants `badge_first_boss` once;
22. five distinct Bosses grant `boss_5` once;
23. sixth Boss does not duplicate `boss_5`;
24. partial payout recovery sets `rewardsGrantedAt` only after completion;
25. challenge prose is not parsed into timers/deadlines;
26. no parent approval inferred from text;
27. Home no longer shows Stage 6 Boss placeholder when dashboard loads;
28. Boss page renders exact canonical steps/reward preview;
29. bottom nav remains exactly five;
30. no DB schema or canonical JSON changes;
31. all six `boss.B0N` logical IDs resolve to production path assets;
32. `npm run validate:assets` passes.

## Browser/persistence smoke at 768×1024

At minimum:
- preserve onboarding/reload baseline;
- seed/complete S01–S05;
- reload; Home shows B01 available;
- open B01 and confirm production Boss image is rendered;
- complete first step;
- reload and verify step persists;
- finish remaining steps in order;
- verify victory;
- verify `boss-exp:B01` exists once and player EXP changed once;
- verify `badge_story_ch1` quantity 1;
- verify cosmetic `boss_b01` exists;
- verify one 5-fragment Boss source and resulting normal chest path;
- verify one chapter chest with frozen outcome;
- reload with no duplicate payout/reroll;
- open chapter chest twice idempotently;
- Hero renders updated rewards/chests;
- English and Stories still open;
- no console/page-breaking errors.

## Regression verification

Run narrow Stage 7 tests first, then at minimum:
- `npm run validate:assets`
- `npm run validate:content`
- `npm run check`
- `npm test`
- existing Stage 3/A7 persistence
- Stage 4 including 300→600→800 vocabulary regression
- Stage 5 story regression
- Stage 6 reward regression
- tablet browser smoke
- `git diff --check`

Do not reset/recreate IndexedDB.
Do not alter canonical Boss/reward/story/task/vocabulary JSON.
Do not merge `main`.

## Git delivery

Commit all Stage 7 implementation changes to `stage7-boss` and push.

Reply only with:
- Files changed
- Implemented
- Stage 7 targeted tests/results
- Existing regression results
- Browser/persistence smoke result
- Commit SHA
- Push result
- Remaining limitations
