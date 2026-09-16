# Stage 6 Rewards / Levels / Inventory — Implementation Audit

Status: READY FOR IMPLEMENTATION

This audit is based on the merged `main` baseline after Stage 5. Stage 6 owns the reward economy foundation: level derivation, claim-once level rewards, titles/badges, reward inventory, chest fragments/chests, and the Hero reward UI. Stage 6 must not implement formal Boss progress/combat (Stage 7), parent settings UI (Stage 8), or final production art/equipment overlays (Stage 10).

## Authoritative inputs

- `AGENTS.md`
- `03_REWARDS_BOSSES/REWARD_SYSTEM.json`
- `03_REWARDS_BOSSES/BOSSES_6.json` only for cross-stage compatibility, not Boss implementation
- `incoming/chatgpt/reports/data-qa/A3_4_REWARD_QA_REPORT.md`
- `01_SPECS/UI_UX_IMPLEMENTATION_SPEC.md`
- `01_SPECS/UI_UX_FLOW_SPEC.md`
- `data/copy/UI_COPY_ZH_TW.json`
- `assets/ASSET_MANIFEST.json`
- existing Stage 3 quest transactions/progress
- existing Stage 4 vocabulary/session progress
- existing Stage 5 story progress

## Baseline findings

### Canonical reward data is ready

A3-4 previously passed 56/56 checks with zero blocking data defects. `REWARD_SYSTEM.json` is canonical and must not be rewritten for runtime convenience.

Important canonical facts:

- cumulative level thresholds: Lv1=0, Lv2=30, Lv3=65, Lv4=105, Lv5=150, Lv6=200, Lv7=255, Lv8=315, Lv9=380, Lv10=450;
- every Lv2-Lv10 milestone offers 3 options and `choose=1`;
- normal chest requires 5 fragments;
- challenge-task fragment source = 1;
- Boss-win fragment source = 5;
- hidden-task fragment chance = 15%;
- material rewards default OFF and max recommended ratio is 20%;
- cosmetics are appearance-only and permanently unlocked;
- failure never removes EXP/rewards.

### Existing persistence is sufficient — no migration required

IndexedDB already contains:

- `player`
- `rewards` keyed by `id`
- `transactions` keyed by `id`
- quest/story/vocabulary progress stores

No DB-version bump is required for Stage 6. Use the existing stores.

`backup.js` already exports/imports all stores through `STORE_KEYS`, so new `rewards` records are automatically included without changing the backup schema.

### Existing EXP is cumulative and must be preserved

Stage 3 currently writes quest EXP atomically into `player.progress.exp.current` and creates an idempotent transaction record. Existing data must be treated as cumulative total EXP.

Stage 6 should normalize/derive:

- `player.progress.level` from canonical cumulative thresholds;
- `player.progress.exp.target` as the next cumulative threshold (Lv10 uses 450 as the capped target);
- preserve `player.progress.exp.current` exactly — never reset it when Stage 6 first loads.

This avoids destructive conversion of Stage 0–5 user data.

### Reward state model

Use `rewards` as a typed record store with stable IDs. Do not use localized labels as primary keys.

Recommended record families:

- `level-claim:<level>` — one permanent claim record per level;
- `inventory:title:<titleId>`;
- `inventory:badge:<badgeId>`;
- `inventory:cosmetic:<cosmeticId>`;
- `inventory:ticket:<ticketId>` with quantity;
- `inventory:privilege:<rewardOptionId>` with quantity/status;
- `fragment-grant:<sourceType>:<sourceId>` — idempotency marker;
- `reward-balance:chest-fragments` — current fragment balance;
- `chest:<stableChestId>` — persisted chest type, source, generated outcome, status, timestamps;
- chest outcome/inventory records as needed.

Equivalent maintainable typed records are acceptable, but claims/opening must remain atomic and reload-safe.

### Level rewards and ticket alias normalization

A3-4 identified that level reward option IDs are not always canonical ticket inventory IDs.

Stage 6 must normalize:

- `reroll_1` → `reroll`, quantity 1
- `reroll_3` → `reroll`, quantity 3
- `quest_skip` → `skip`, quantity 1
- `boss_retry` → `boss_retry`, quantity 1
- `bonus_exp_2` → `bonus2`, quantity 1
- `double_exp` → `double`, quantity 1
- `rest_card` → `rest`, quantity 1

`mystery_unlock` has no canonical entry in `tickets[]`. Do **not** invent a new persistent ticket type. Treat this option as deferred/unavailable in Stage 6 UI while keeping the other Lv7 choices usable. This is an explicit implementation decision, not a canonical-data rewrite.

### Material reward rule

`small_gift` is `material_optional` and material rewards default OFF.

Stage 6 behavior:

- if no explicit parent setting exists, material rewards are OFF;
- hide/disable `small_gift` by default;
- if a future/optional settings record has `materialRewardsEnabled === true`, the option may become claimable;
- do not build the parent toggle in Stage 6; Stage 8 owns that UI.

Lv10 remains claimable because cosmetic and privilege options remain available.

### Titles and badges

Reward conditions are human-readable strings rather than a machine-rule schema. Stage 6 may use stable-ID evaluators in the reward service, but must not parse localized condition text as business logic.

Immediately evaluable from existing Stage 0–5 data:

Titles:
- `first_quest`: completed quests >=1
- `task_10`: completed quests >=10
- `task_50`: completed quests >=50
- `english_10`: completed quest-history records with canonical category `english` >=10
- `english_50`: mastered words >=50
- `reading_10`: completed stories >=10
- `reading_30`: completed stories >=30
- `life_10`: completed quest-history records with canonical category `life` >=10
- `coop_10`: completed quest-history records with canonical category `cooperation` >=10

Badges:
- `badge_first`: completed quests >=1
- `badge_30task`: completed quests >=30
- `badge_100task`: completed quests >=100
- `badge_word100`: mastered words >=100
- `badge_story_ch1` … `badge_story_ch6`: the corresponding five StoryProgress records are completed

Defer conditions that Stage 0–5 do not reliably capture:

- retry counts
- focus-minute total
- 7-day streak
- self-start timing semantics
- Boss victory counts / first Boss

Do not fabricate those counters solely to unlock rewards.

Unlock records must be idempotent. Re-running synchronization after reload must not duplicate inventory.

### Active title

Current player data stores the title display string. Stage 6 may add an optional stable `activeTitleId` field inside `player.progress` while preserving `title` for current UI/backup compatibility.

Selecting an unlocked title should persist both stable ID and display name. Do not auto-remove prior unlocks.

### Cosmetics

Level reward cosmetic IDs are stable and have matching logical asset IDs such as `cosmetic.frame_bronze`, but production cosmetic art remains pending until Stage 10.

Stage 6 should implement permanent cosmetic ownership/inventory and text/CSS fallback presentation.

Do **not** invent visual equipment-slot metadata that does not exist in canonical reward data/asset manifest. Actual layered equipment rendering/equip-slot integration can remain for Stage 10 unless a stable slot can be derived from an existing authoritative field.

### Chest fragments — important Stage 3 boundary

The current canonical task records do not contain a reliable `questType=challenge` field, and the task QA explicitly says no static hidden-task records exist. Therefore Stage 6 must **not** infer challenge status from EXP, star difficulty, task name, or category.

Implement an explicit idempotent API such as:

- `grantChestFragments(db, { sourceType, sourceId, amount })`

This lets later systems grant canonical fragment sources when they have an authoritative event.

Stage 6 must not automatically award challenge fragments to ordinary Stage 3 quests merely because they have high EXP.

When fragment balance reaches 5, convert each complete group of 5 into one persisted unopened `normal` chest while preserving any remainder.

### Chest outcome persistence

Opening/reloading/double-clicking must never reroll or duplicate a chest.

Preferred policy:

1. When a chest is granted/created, generate and persist its outcome once.
2. `openChest` only reveals/applies that already-persisted outcome atomically.
3. After reload, the same chest/outcome remains.
4. A second open is a no-op and returns the existing result.

The canonical chest pools contain localized labels/categories rather than durable item IDs. Build a small stable internal outcome catalog at the RewardService boundary (for example stable IDs derived from chest pool/type/item coordinates or explicit normalized catalog IDs) and store both stable outcome ID and display-label snapshot. Never use the localized label itself as the record key.

Known ticket labels from chest pools should normalize to canonical ticket IDs where possible. Generic cosmetic/badge-fragment/special-event outcomes may remain stable reward tokens/entitlements until concrete assets/rules exist.

If a chest outcome grants immediate bonus EXP (+2/+3), apply it through an idempotent `transactions` record and normalize player level in the same logical operation; do not mutate EXP without a transaction.

### Boss reward ambiguity is Stage 7, not Stage 6

`fragmentSources.bossWin=5` can produce one normal chest, while each Boss also specifies an explicit `chapter` chest. Do not silently decide this by wiring Stage 6 to Boss progress.

Stage 6 should expose generic, idempotent fragment/chest grant APIs. Stage 7 must explicitly decide/call the intended Boss reward paths and will be reviewed separately.

Story chapter badges may already be unlocked by Stage 6 story completion conditions; a later Boss attempt to grant the same stable badge ID must remain idempotent.

## UI integration

Stage 6 should replace the current Hero placeholder with a functional Hero/Rewards view while keeping the existing five bottom-nav routes.

Minimum Hero view:

- protagonist + nickname;
- current level;
- cumulative EXP / next threshold;
- current title and unlocked-title selector;
- pending level milestone reward claims;
- chest fragments and unopened chests;
- badge collection;
- cosmetic collection;
- ticket inventory;
- privilege/other reward collection;
- clear copy that cosmetics do not affect stats.

Use pending asset fallbacks; Stage 10 owns final visual refinement.

Home should replace “等待獎勵系統” with the real chest-fragment value and use normalized level/EXP state.

Do not add a sixth bottom navigation item.

## Refresh/synchronization boundary

Stage 6 reward synchronization should run:

- on app startup;
- after a quest completion/approval that can change EXP or quest-count conditions;
- after a completed English session when mastery/session-derived conditions may change;
- after story completion;
- after claiming a level reward;
- after opening/granting a chest or selecting a title.

Keep this focused; do not rescan/rewrite canonical content on every render.

## Stage 6 acceptance gate

Implementation must prove at minimum:

1. canonical thresholds/reward catalogs load from `REWARD_SYSTEM.json`;
2. cumulative EXP 0/29/30/64/65/.../450 resolves correct level/next target;
3. pre-Stage6 cumulative EXP is preserved when level state is normalized;
4. level reward eligibility is derived from achieved level;
5. a level reward can be claimed only once, including double-click/reload;
6. claiming one option does not grant the other two;
7. ticket aliases normalize to canonical ticket IDs and quantities;
8. `mystery_unlock` is not persisted as an invented ticket;
9. material reward is unavailable by default;
10. cosmetic unlocks are permanent and have no stat/ability effect;
11. immediately-evaluable title/badge conditions sync from existing quest/word/story data;
12. unsupported/deferred title/badge conditions do not unlock accidentally;
13. unlocked title selection persists across reload;
14. explicit fragment grant is idempotent by source;
15. five fragments create exactly one normal chest, with remainders preserved;
16. ordinary Stage 3 quest completion does not infer a challenge fragment without an authoritative challenge event;
17. chest outcome is persisted once and does not reroll on reload/open-repeat;
18. chest opening does not duplicate inventory or bonus EXP;
19. immediate bonus EXP uses an idempotent transaction and recalculates level safely;
20. Hero route shows real reward state; Home shows real fragment count;
21. Stage 3 quest EXP/no-double-EXP behavior remains PASS;
22. Stage 4 English 300→600→800 and progress regressions remain PASS;
23. Stage 5 story completion/reload/idempotency remains PASS;
24. backup/persistence baseline remains PASS.

## Gate conclusion

Stage 6 is READY. No canonical JSON rewrite or IndexedDB migration is required. The principal implementation risks are reward idempotency, level normalization of existing cumulative EXP, ticket alias handling, chest outcome persistence, and avoiding invented challenge/Boss semantics.