# Stage 6 Codex Implementation Prompt

Read `AGENTS.md` first.
Work only on branch `stage6-rewards`.
Do not merge to `main`.

Stage 0–5 are complete and merged. Stage 6 audit is complete. Do not redo prior content QA, do not rewrite canonical JSON, and do not implement Stage 7+ Boss, Stage 8 parent-settings UI, Stage 9 PWA/backup UI, or Stage 10 final art/equipment overlays.

Read only the files needed for this task, starting with:

- `06_GUIDES/STAGE6_IMPLEMENTATION_AUDIT.md`
- `03_REWARDS_BOSSES/REWARD_SYSTEM.json`
- `incoming/chatgpt/reports/data-qa/A3_4_REWARD_QA_REPORT.md`
- current `js/services/quest-service.js`
- current `js/core/app-state.js`
- current `js/services/onboarding-storage.js`
- current `js/pages/home.js`
- current `js/pages/placeholder.js`
- current `js/ui/app-shell.js`
- current Stage 4/5 progress repositories only as needed
- relevant reward/hero copy and asset-manifest entries

Preserve Stage 3/4/5 behavior and unrelated files.

## Implement Stage 6 Rewards / Levels / Inventory

### 1. Canonical reward repository/service boundary

Load `03_REWARDS_BOSSES/REWARD_SYSTEM.json` as canonical reward data.

Provide focused APIs for:
- canonical level thresholds;
- level reward options;
- title/badge catalogs;
- ticket catalog;
- chest configuration/pools;
- material reward policy.

Do not copy canonical reward entries into page code.

Validate enough at load time to fail safely if critical reward structure is missing, but do not rewrite the JSON.

### 2. Level calculation and existing EXP normalization

Treat `player.progress.exp.current` as cumulative lifetime EXP already earned by Stage 3.

Implement pure level derivation from canonical thresholds.

Required examples:
- 0–29 → Lv1, next target 30
- 30–64 → Lv2, next target 65
- 65–104 → Lv3, next target 105
- ...
- >=450 → Lv10, target 450

On Stage 6 startup/reward synchronization:
- preserve cumulative `exp.current` exactly;
- update persisted `player.progress.level` if stale;
- update `player.progress.exp.target` to canonical next cumulative threshold;
- preserve unrelated player fields.

Do not reset EXP and do not migrate IndexedDB schema.

### 3. Rewards repository

Use existing IndexedDB `rewards` store keyed by `id`.

Implement maintainable typed records with stable IDs for at least:
- level claims;
- title unlocks;
- badge unlocks;
- cosmetic inventory;
- canonical ticket inventory + quantity;
- privilege/entitlement inventory;
- chest-fragment balance and idempotent grants;
- chest records with persisted outcome/status.

Localized names are display snapshots only, never durable primary keys.

Add only repository APIs actually needed by Stage 6.

### 4. Reward transactions / EXP safety

Preserve existing Stage 3 quest EXP transaction behavior.

Any new Stage 6 operation that adds EXP, including chest bonus EXP, must have an idempotent transaction record and must not double-pay under:
- double click;
- repeated function call;
- reload;
- two overlapping calls where practical to test.

Keep stable transaction IDs derived from source IDs.

Do not subtract EXP on failure.

### 5. Level milestone claims

For each achieved Lv2–Lv10 that has no `level-claim:<level>` record, expose a pending milestone claim.

Claim rules:
- exactly one option per level;
- claim is atomic and permanent;
- duplicate/double/reload claim returns existing result and grants nothing extra;
- once one option is claimed, the other two cannot be claimed later;
- jumping multiple levels leaves each reached level independently claimable.

Supported option effects:

#### Cosmetic
Persist permanent ownership of the canonical option ID.
No stat/ability changes.

#### Privilege
Persist stable entitlement/inventory using reward option ID and display name.
Do not invent redemption rules in Stage 6.

#### Ticket normalization
Normalize exactly:
- `reroll_1` → `reroll` ×1
- `reroll_3` → `reroll` ×3
- `quest_skip` → `skip` ×1
- `boss_retry` → `boss_retry` ×1
- `bonus_exp_2` → `bonus2` ×1
- `double_exp` → `double` ×1
- `rest_card` → `rest` ×1

`mystery_unlock` has no canonical `tickets[]` entry. Do NOT invent one. Mark that option deferred/unavailable in Stage 6 UI/service; the other Lv7 choices remain usable.

#### Material optional
`small_gift` must be hidden/disabled unless settings explicitly contain `materialRewardsEnabled === true`.
Absence of that setting means false.
Do not build the parent toggle here.

### 6. Titles and badges synchronization

Create stable-ID evaluators; do not parse localized condition strings.

Evaluate now:

Titles:
- `first_quest`: completed quest count >=1
- `task_10`: completed quest count >=10
- `task_50`: completed quest count >=50
- `english_10`: completed quest-history records with canonicalCategory `english` >=10
- `english_50`: wordProgress state `mastered` >=50
- `reading_10`: completed storyProgress >=10
- `reading_30`: completed storyProgress >=30
- `life_10`: completed questHistory canonicalCategory `life` >=10
- `coop_10`: completed questHistory canonicalCategory `cooperation` >=10

Badges:
- `badge_first`: completed quest count >=1
- `badge_30task`: completed quest count >=30
- `badge_100task`: completed quest count >=100
- `badge_word100`: mastered word count >=100
- `badge_story_ch1` through `badge_story_ch6`: each corresponding stable Sxx five-story group completed

Do not unlock yet:
- retry titles;
- focus-minute title;
- streak title/badge;
- self-start title;
- Boss title/badge.

Synchronization must be idempotent and backfill prior Stage 3–5 progress on first Stage 6 load.

### 7. Active title

Allow the child to select from unlocked canonical titles.

Persist an optional stable `player.progress.activeTitleId` and preserve/update the existing display `player.progress.title` for compatibility.

A title can be selected only if unlocked.
Reload must preserve it.

### 8. Cosmetics boundary

Persist permanent ownership of canonical level cosmetic IDs.
Use `cosmetic.<id>` asset logical IDs where relevant for display fallback.

Do not invent missing slot metadata and do not implement final layered costume rendering in Stage 6.
A text/CSS collection is acceptable until Stage 10.

### 9. Chest fragments

Implement explicit idempotent grant API; for example:

`grantChestFragments(db, { sourceType, sourceId, amount })`

Requirements:
- stable grant marker prevents repeated source payment;
- preserve remainder;
- each complete 5 fragments creates exactly one persisted unopened `normal` chest;
- 10 fragments can create two chests;
- reload preserves balance/chests.

Critical boundary:
The Stage 3 task data has no authoritative challenge/hidden classification. Do NOT infer challenge from difficulty stars, EXP, names, or category and do NOT automatically grant a fragment to ordinary quests.

Do not wire Boss fragment rewards in Stage 6.

### 10. Chest creation/opening

A chest must have a stable ID and its outcome must be generated/persisted exactly once at chest creation/grant time.

`openChest` must:
- apply/reveal only the stored outcome;
- be atomic/idempotent;
- never reroll on reload;
- never duplicate inventory/EXP.

Build a small stable internal chest-outcome catalog from canonical pool entries. Persist a stable outcome ID plus label/type snapshot. Do not use localized labels as keys.

Normalize known ticket labels to canonical ticket IDs when a chest awards them.
Generic cosmetic/badge-fragment/special-event outcomes may be persisted as stable reward tokens/entitlements until concrete Stage 7/10 rules/assets exist.

If an outcome is canonical immediate `+2 EXP` or `+3 EXP`, award it via an idempotent transaction and recalculate the player level/target safely.

Make RNG injectable for targeted tests if useful; runtime may use normal local randomness, but the persisted outcome must freeze the result before open.

### 11. Boss compatibility only

Do not implement `bossProgress`, Boss victory, Boss reward issuing, or decide whether Boss gives both 5 fragments and a chapter chest.

Expose generic idempotent fragment/chest/inventory APIs that Stage 7 can call later.

If Stage 7 later attempts to grant an already-owned story badge by the same stable badge ID, Stage 6 inventory semantics must make it a no-op rather than a duplicate.

### 12. Reward synchronization service

Create one focused synchronization/dashboard service that can:
- normalize player level/target;
- derive reward metrics from existing questHistory/wordProgress/wordSessions/storyProgress;
- backfill newly eligible titles/badges;
- load level claims, inventory, fragment balance, unopened chests;
- return a `rewardUi`/dashboard model for pages.

Refresh it:
- app startup;
- after quest completion/approval;
- after an English session completes;
- after story completion;
- after level claim;
- after title selection;
- after fragment/chest operations.

Avoid unrelated refactors.

### 13. Hero / Rewards UI

Replace the current Hero placeholder with a functional route/page.
Keep exactly five bottom-nav items.

At minimum show:
- protagonist + nickname;
- current Lv;
- cumulative EXP / next threshold;
- current title;
- unlocked title selector;
- pending Lv milestone claims with available options;
- chest fragments (`current / 5`);
- unopened chest cards + open action;
- badge collection;
- cosmetic collection;
- ticket quantities;
- privilege/other reward collection;
- “外觀不會改變能力值” messaging.

Use existing UI copy where possible and add only narrowly needed Traditional-Chinese copy.
Use CSS/text fallbacks for pending badge/cosmetic art.

### 14. Home integration

Replace the Home chest fragment placeholder with actual fragment balance.
Home level/EXP must reflect normalized player state.

Do not add a Rewards bottom-nav item.

### 15. Required targeted tests

Add Stage 6 tests proving at minimum:

1. canonical reward system loads and canonical threshold table is used;
2. level boundaries at 0,29,30,64,65,104,105,449,450,451;
3. existing cumulative EXP is never reduced/reset by normalization;
4. target is next cumulative threshold and Lv10 target remains 450;
5. reached level exposes unclaimed milestone(s);
6. one level option claim is permanent and blocks alternate choices;
7. duplicate/reload claim does not duplicate inventory;
8. ticket aliases/quantities normalize exactly;
9. `mystery_unlock` is not persisted as a fake canonical ticket;
10. material option unavailable by default;
11. cosmetic claim has no player stats/ability side effect;
12. title/badge eligible rules backfill from Stage 3–5 data;
13. deferred title/badge rules stay locked;
14. active-title selection requires unlock and survives reload;
15. one fragment source cannot pay twice;
16. 4→no chest, 5→1 chest, 7→1 chest+2 remainder, 10→2 chests;
17. no Stage 3 ordinary quest is auto-treated as challenge;
18. chest outcome is persisted before open and stable across reload;
19. opening same chest twice does not duplicate reward;
20. bonus EXP chest outcome creates one EXP transaction and safely recalculates level;
21. Hero UI uses real reward state;
22. Home uses real fragment state;
23. no `bossProgress` Stage 7 behavior was added.

### 16. Browser/persistence smoke at 768×1024

At minimum cover:
- existing onboarding/reload baseline;
- seed or earn EXP across Lv2 threshold, verify level/target;
- open Hero route;
- see one pending level claim;
- claim a deterministic supported option (prefer simple cosmetic or canonical ticket);
- verify only that option is awarded;
- reload and verify claim/inventory persists and cannot pay again;
- verify Home chest fragment display is real, not placeholder;
- create/grant fragments through Stage 6 service in the harness, verify one unopened chest at 5 fragments;
- reload and verify same chest/outcome;
- open it twice and verify no duplicate result;
- verify Stage 4 Learn and Stage 5 Stories still open correctly;
- no console/page errors.

### 17. Regression verification

Run narrow Stage 6 tests first, then at minimum:
- `npm run validate:content`
- `npm run check`
- existing Stage 3/A7/persistence regression
- Stage 4 tests including 300→600→800
- Stage 5 tests
- tablet browser smoke
- `git diff --check`

Do not reset/recreate IndexedDB.
Do not alter canonical reward/task/story/vocabulary JSON.
Do not merge `main`.

## Git delivery

Commit all Stage 6 implementation changes to `stage6-rewards` and push to GitHub.

Reply only with:
- Files changed
- Implemented
- Stage 6 targeted tests/results
- Existing regression results
- Browser smoke result
- Commit SHA
- Push result
- Remaining limitations
