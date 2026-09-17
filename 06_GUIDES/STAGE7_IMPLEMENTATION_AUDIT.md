# Stage 7 Boss System — Implementation Audit

Status: **READY FOR IMPLEMENTATION**

This audit is based on the merged `main` baseline after Stage 6 plus completed A6 production-art integration. Stage 7 owns the six canonical Bosses, chapter-derived unlock state, persistent Boss step progress, idempotent Boss victory EXP/rewards, Home Boss integration, and a functional Boss challenge view. It must not implement Stage 8 parent settings/weekly report, Stage 9 offline/backup UI, or Stage 10 broad visual-polish/equipment-overlay work.

## Authoritative inputs

- `AGENTS.md`
- `03_REWARDS_BOSSES/BOSSES_6.json`
- `03_REWARDS_BOSSES/REWARD_SYSTEM.json`
- `incoming/chatgpt/reports/data-qa/A3_5_BOSS_QA_REPORT.md`
- `incoming/chatgpt/reports/data-qa/A3_4_REWARD_QA_REPORT.md`
- `01_SPECS/UI_UX_IMPLEMENTATION_SPEC.md`
- `01_SPECS/UI_UX_FLOW_SPEC.md`
- `00_START_HERE/GPT6_DEVELOPMENT_PROMPT.md`
- `05_TESTS/ACCEPTANCE_TESTS.md`
- `assets/ASSET_MANIFEST.json`
- existing Stage 5 story/chapter services
- existing Stage 6 reward services

## Baseline findings

### Canonical Boss data is ready

A3-5 previously passed **55/55 checks** with zero blocking defects. `BOSSES_6.json` remains canonical and must not be rewritten.

Canonical Bosses:

- B01 / Chapter 1 / 金錢森林 / 貪吃錢袋怪 / HP 3 / EXP 10
- B02 / Chapter 2 / 等待之谷 / 現在就要巨人 / HP 3 / EXP 10
- B03 / Chapter 3 / 成長山脈 / 放棄石巨人 / HP 3 / EXP 12
- B04 / Chapter 4 / 智慧迷宮 / 唯一答案魔王 / HP 5 / EXP 12
- B05 / Chapter 5 / 時間王國 / 時間吞噬獸 / HP 4 / EXP 12
- B06 / Chapter 6 / 友情之城 / 誤會迷霧龍 / HP 3 / EXP 15

For every Boss, HP equals the number of canonical progress steps.

### Existing persistence is sufficient — no migration required

`js/core/db-schema.js` already contains `bossProgress` keyed by `bossId`; Stage 6 already uses `player`, `transactions`, and `rewards` for idempotent rewards.

Stage 7 must **not** bump the DB version merely for Boss implementation.

### Existing Stage 5 chapter mapping is authoritative

`js/services/story-chapters.js` already derives chapter number from stable `S01`–`S30` IDs and exposes `chapterProgress()`.

Do not derive Boss unlocks from story array indexes or localized labels.

### A6 production art is now complete

`assets/ASSET_MANIFEST.json` is now the canonical production asset contract with:

- 167 total assets;
- 167 ready;
- 0 pending;
- six ready Boss illustrations `boss.B01` … `boss.B06`;
- six ready Boss cosmetics `cosmetic.boss_b01` … `cosmetic.boss_b06`;
- ready chapter badges/backgrounds/story/task art.

Only optional vocabulary imagery remains outside the A6 baseline.

Stage 7 should therefore use production Boss art through AssetRegistry. Keep fallback behavior as a defensive runtime boundary only; do not deliberately render placeholders when the ready logical asset resolves.

Run `npm run validate:assets` as part of Stage 7 regression verification.

## Stage 7 policy decisions

### 1. Boss unlock policy

A Boss becomes available when **all five stories in its own chapter are completed**.

- B01 requires S01–S05.
- B02 requires S06–S10.
- B03 requires S11–S15.
- B04 requires S16–S20.
- B05 requires S21–S25.
- B06 requires S26–S30.

Boundaries:
- existing Stage 5 story chapters remain readable;
- defeating one Boss does not bypass the next chapter story requirement;
- Boss availability is derived from StoryProgress, not a persisted `locked` flag;
- Home chooses the lowest-chapter available + undefeated Boss;
- if no undefeated Boss is available, Home may preview the next undefeated Boss as locked with `x / 5` story progress;
- defeated Bosses remain viewable.

### 2. Boss progress persistence

Use existing `bossProgress` keyed by `bossId`.

Persist at least:
- `bossId`
- `completedSteps` — stable numeric step IDs, unique/sorted
- `startedAt`
- `updatedAt`
- `defeatedAt`
- `rewardsGrantedAt`

Do not persist mutable copies of canonical HP/challenge/reward text.

Rules:
- Boss must be unlocked before a step can complete;
- steps complete in canonical order;
- duplicate completion is a no-op;
- reload preserves progress;
- final step sets `defeatedAt` once;
- no failure penalty or invented failure counter.

### 3. Parent-confirmation policy

`BOSSES_6.json` has no structured approval flag.

Stage 7 therefore:
- self-records Boss steps;
- does not infer approval from Chinese prose;
- does not require PIN for Boss steps;
- leaves any future parent policy to Stage 8.

### 4. Challenge prose is instructional only

Do not parse `一週`, `三天`, `10分鐘`, B05 `今日Boss`, or similar prose into timers, deadlines, recurring jobs, or hidden rules.

### 5. Boss victory reward policy — honor both canonical chest paths

Each first Boss victory grants exactly once:

1. canonical Boss EXP via idempotent transaction;
2. corresponding chapter badge:
   - B01 → `badge_story_ch1`
   - ...
   - B06 → `badge_story_ch6`
3. corresponding Boss cosmetic:
   - B01 → `boss_b01`
   - ...
   - B06 → `boss_b06`
4. **5 Boss-win chest fragments** through Stage 6 `grantChestFragments()`; this may create one normal chest;
5. one explicit **chapter chest**.

Thus a first Boss victory may legitimately create both:
- normal chest from 5 fragments; and
- chapter chest from the Boss reward.

Both must be idempotent.

### 6. Chapter chest pool policy

Canonical reward data defines `chapter` chest type but no `chapterChestPool`.

Stage 7 resolver:
- persist `chestType: "chapter"`;
- use existing canonical `bossChestPool` to freeze the outcome;
- call Stage 6 `grantChest()` with `poolType: "boss"` while preserving `chestType: "chapter"`.

Outcome freezes at grant time and is never rerolled by reload/open.

### 7. Stable reward sources

Use Stage 6 generic APIs; do not write ad-hoc Boss inventory directly into `rewards`.

Recommended stable sources:
- EXP: transaction `boss-exp:<bossId>`
- chapter badge: `sourceType="boss-badge"`, `sourceId=<bossId>`
- Boss cosmetic: `sourceType="boss-cosmetic"`, `sourceId=<bossId>`
- Boss fragments: `sourceType="boss-win"`, `sourceId=<bossId>`
- chapter chest: `sourceType="boss-chapter"`, `sourceId=<bossId>`
- first-Boss badge: `sourceType="boss-achievement-first"`, stable one-time source
- five-Boss title: `sourceType="boss-achievement"`, `sourceId="boss_5"`

Do not reuse the same source pair for different reward components.

### 8. Existing story badge ownership remains idempotent

Stage 6 may already own `badge_story_ch1...ch6` after 5/5 stories. Boss victory may call the same permanent inventory item ID; ownership remains quantity 1.

### 9. Boss-specific achievements

Stage 7 may resolve only:
- first defeated Boss → `badge_first_boss`
- five distinct defeated Bosses → title `boss_5` / `Boss Slayer`

Do not unlock unrelated retry/streak/focus/self-start achievements.

### 10. Interrupted reward recovery

Robust sequence:
1. persist final step and `defeatedAt` once;
2. issue EXP/rewards using stable idempotent sources;
3. set `rewardsGrantedAt` only after all required grants succeed.

On startup/synchronization, `defeatedAt` + missing `rewardsGrantedAt` must retry payout safely.

### 11. Boss EXP

Use `transactions` with stable ID `boss-exp:<bossId>`.

Requirements:
- preserve lifetime EXP;
- pay canonical amount once;
- reload/duplicate finalize cannot pay again;
- recalculate level/target using Stage 6 canonical threshold logic;
- no EXP removal for incomplete attempts.

### 12. Production art boundary

Use AssetRegistry logical IDs:
- Boss illustration: `boss.B01` … `boss.B06`
- Boss cosmetic: `cosmetic.boss_b01` … `cosmetic.boss_b06`
- chapter badge logical IDs already defined in manifest.

All six Boss images are production-ready. Stage 7 should render them directly when resolved. Keep CSS/text fallback only if resolution unexpectedly fails.

Do not copy raw asset paths into business logic; resolve by logical ID.

## UI integration

### Home

Replace the Stage 6 Boss placeholder with real state:
- chapter/name;
- locked / available / in-progress / defeated;
- `x / 5` story progress if locked;
- HP/step progress if available/in-progress;
- CTA to open Boss challenge;
- all-complete state after all six defeated.

### Boss challenge view

No sixth bottom-nav item. Use an internal Home subview/state.

Show at minimum:
- production Boss art from AssetRegistry;
- chapter + Boss name;
- canonical story/description;
- canonical challenge text;
- HP/progress;
- all 3–5 canonical progress steps;
- only next incomplete step active;
- reward preview: EXP, badge, chapter chest, Boss cosmetic, +5 fragments;
- locked explanation when needed;
- defeated/victory state;
- Back/Home action.

After victory, surface unopened chapter chest via Stage 6 `openChest()` semantics. The normal fragment chest may remain in Hero inventory.

## Recommended boundaries

Focused additions:
- `js/repositories/bosses.js`
- `js/repositories/boss-progress.js`
- `js/services/boss-service.js`
- `js/pages/boss.js`
- `css/boss.css`

Equivalent focused separation is acceptable.

Do not hardcode canonical Boss reward prose in page HTML. Stable B01–B06 reward item mapping belongs in service/config code.

## Required acceptance coverage

Targeted tests must prove at minimum:

1. B01–B06 canonical load/chapter/HP-step integrity;
2. stable chapter/story linkage;
3. B01 locked at 4/5 and unlocked at 5/5;
4. B02 independently requires S06–S10;
5. BossProgress survives reload;
6. locked Boss cannot record progress;
7. steps must complete in order;
8. duplicate step completion is idempotent;
9. final step sets `defeatedAt` once;
10. Boss EXP pays canonical amount once;
11. owned chapter badge remains quantity 1;
12. Boss cosmetic uses stable `boss_b0N` item ID;
13. Boss win grants exactly 5 fragments once;
14. fragment path creates normal chest exactly once;
15. explicit chapter chest also creates exactly once;
16. chapter chest keeps `chestType="chapter"` with frozen `bossChestPool` outcome;
17. reload/retry does not reroll or duplicate chests;
18. first Boss unlocks `badge_first_boss` once;
19. five distinct Bosses unlock `boss_5` once;
20. sixth Boss does not duplicate `boss_5`;
21. partial payout safely retries until `rewardsGrantedAt`;
22. challenge prose is not parsed into runtime timers/deadlines;
23. no inferred parent confirmation;
24. Home uses real Boss state;
25. Boss page renders exact canonical step count and reward preview;
26. bottom nav remains exactly five items;
27. no DB migration/canonical JSON rewrite;
28. production `boss.B01...B06` logical assets resolve to paths, not deliberate placeholder UI;
29. `npm run validate:assets` passes;
30. Stage 3–6 regressions pass.

## Browser/persistence smoke at 768×1024

At minimum:
- preserve onboarding/reload baseline;
- seed/complete S01–S05;
- reload; Home shows B01 available;
- open B01 and confirm production Boss image renders;
- complete step 1, reload, verify persistence;
- complete remaining steps in order;
- verify victory;
- verify one Boss EXP transaction;
- verify Boss cosmetic and chapter badge inventory;
- verify 5-fragment normal chest path + explicit chapter chest each exactly once;
- reload with no duplicate payout/reroll;
- open chapter chest twice idempotently;
- Hero, English, Stories still work;
- no console/page-breaking errors.

## Gate conclusion

Stage 7 is **READY** on the A6-complete baseline. No canonical JSON rewrite or IndexedDB migration is required. Main risks remain unlock derivation, ordered persistence, partial-victory recovery, Boss EXP idempotency, and keeping the two canonical chest paths distinct.