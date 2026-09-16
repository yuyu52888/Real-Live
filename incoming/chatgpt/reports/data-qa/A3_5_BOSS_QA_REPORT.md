# Real Life Quest｜A3-5 Boss QA Report v1.0

**Result:** PASS
**Checks:** 55/55 PASS
**Blocking errors:** 0
**Integration notes/warnings:** 8

## Scope
- `03_REWARDS_BOSSES/BOSSES_6.json`
- `03_REWARDS_BOSSES/REWARD_SYSTEM.json`
- `02_DATA/thinking_stories_30.json`
- Stage 7 UI/flow/acceptance requirements
- A5 `ASSET_MANIFEST.json` Boss + cosmetic contracts

## Boss summary

| Boss | Chapter | HP/Steps | EXP | Badge label | Chest | Cosmetic |
|---|---|---:|---:|---|---|---|
| B01 貪吃錢袋怪 | 1 金錢森林 | 3/3 | 10 | 金錢森林 | chapter | 金色錢包頭像框 |
| B02 現在就要巨人 | 2 等待之谷 | 3/3 | 10 | 等待之谷 | chapter | 耐心沙漏 |
| B03 放棄石巨人 | 3 成長山脈 | 3/3 | 12 | 成長山脈 | chapter | 勇者披風 |
| B04 唯一答案魔王 | 4 智慧迷宮 | 5/5 | 12 | 智慧迷宮 | chapter | 智慧眼鏡 |
| B05 時間吞噬獸 | 5 時間王國 | 4/4 | 12 | 時間王國 | chapter | 時間守護者頭像框 |
| B06 誤會迷霧龍 | 6 友情之城 | 3/3 | 15 | 友情之城 | chapter | 友情徽章披肩 |

## Automated checks
- [x] **PASS** — BOSSES_6 is a list
- [x] **PASS** — Boss count = 6 — `count=6`
- [x] **PASS** — Boss IDs unique — `['B01', 'B02', 'B03', 'B04', 'B05', 'B06']`
- [x] **PASS** — Boss IDs sequential B01-B06 — `['B01', 'B02', 'B03', 'B04', 'B05', 'B06']`
- [x] **PASS** — Boss chapters are unique — `[1, 2, 3, 4, 5, 6]`
- [x] **PASS** — Boss chapters sequential 1-6 — `[1, 2, 3, 4, 5, 6]`
- [x] **PASS** — Chapter names match approved six chapters
- [x] **PASS** — Boss names unique
- [x] **PASS** — All required Boss fields present
- [x] **PASS** — Boss story/challenge text nonblank
- [x] **PASS** — Boss HP is positive integer
- [x] **PASS** — Each Boss has 3-5 progress nodes — `{'B01': 3, 'B02': 3, 'B03': 3, 'B04': 5, 'B05': 4, 'B06': 3}`
- [x] **PASS** — HP equals progress-node count — `{'B01': (3, 3), 'B02': (3, 3), 'B03': (3, 3), 'B04': (5, 5), 'B05': (4, 4), 'B06': (3, 3)}`
- [x] **PASS** — Progress step numbers are contiguous 1..HP
- [x] **PASS** — Progress descriptions nonblank
- [x] **PASS** — Progress step numbers unique within each Boss
- [x] **PASS** — Reward object exists for each Boss
- [x] **PASS** — Reward fields exp/badge/chest/cosmetic present
- [x] **PASS** — Boss reward EXP is integer 10-15 — `{'B01': 10, 'B02': 10, 'B03': 12, 'B04': 12, 'B05': 12, 'B06': 15}`
- [x] **PASS** — Boss reward badge labels nonblank
- [x] **PASS** — Boss reward chest labels nonblank
- [x] **PASS** — Boss reward cosmetic labels nonblank
- [x] **PASS** — Boss reward cosmetics unique
- [x] **PASS** — Boss data contains no negative numeric reward values
- [x] **PASS** — Every Boss reward badge label resolves to reward badge catalog
- [x] **PASS** — Every Boss reward chest resolves to known chest type — `{'boss', 'normal', 'chapter'}`
- [x] **PASS** — All six chapter story badges exist
- [x] **PASS** — Boss badge label maps exactly to chapter story badge name
- [x] **PASS** — First Boss victory badge exists
- [x] **PASS** — Boss title progression exists
- [x] **PASS** — bossWin fragment source = 5
- [x] **PASS** — Chest fragmentsNeeded = 5
- [x] **PASS** — Boss reward chest type is chapter for all six
- [x] **PASS** — Story count = 30 for chapter linkage
- [x] **PASS** — Story IDs sequential S01-S30 for Boss linkage
- [x] **PASS** — Six Boss chapters resolve to six groups of five stories
- [x] **PASS** — Development spec states every five stories form one chapter
- [x] **PASS** — Boss defeat spec includes chapter progress
- [x] **PASS** — UI flow requires Boss image/name/chapter/HP/challenge/reward
- [x] **PASS** — UI flow requires 3-5 progress nodes
- [x] **PASS** — UI implementation requires EXP/badge/chest/cosmetic preview
- [x] **PASS** — UI implementation requires Boss defeat/chest animation
- [x] **PASS** — Acceptance tests require Boss progress reload persistence
- [x] **PASS** — Stage 7 dev spec requires step persistence after reload
- [x] **PASS** — Art Bible defines Boss as child-safe growth-obstacle visualization
- [x] **PASS** — Art Bible explicitly forbids scary Boss presentation
- [x] **PASS** — A5 contains six Boss illustration logical IDs
- [x] **PASS** — A5 Boss illustration content IDs match B01-B06
- [x] **PASS** — A5 Boss illustration labels match canonical Boss names
- [x] **PASS** — A5 Boss illustration chapter metadata matches canonical data
- [x] **PASS** — A5 contains six Boss cosmetic logical IDs
- [x] **PASS** — A5 Boss cosmetic labels match canonical reward cosmetics
- [x] **PASS** — Boss art remains non-blocking until Stage 10
- [x] **PASS** — Boss cosmetic art remains non-blocking until Stage 10
- [x] **PASS** — Boss challenges contain no obvious child-solo hazardous activity keywords — `[]`

## Integration warnings / decisions
### BOSS-W01 — Chapter chest type exists but has no dedicated chapterChestPool
- Stage: **Stage 6 / Stage 7**
- Type: `integration-decision`
- All B01-B06 rewards specify chest="chapter" and chestTypes includes chapter, but REWARD_SYSTEM defines only normalChestPool and bossChestPool. Stage 6/7 needs an explicit resolver/pool policy for chapter chests; do not guess from display text.

### BOSS-W02 — Boss victory can trigger both 5 fragments and an explicit chapter chest
- Stage: **Stage 6 / Stage 7**
- Type: `integration-decision`
- fragmentSources.bossWin=5 equals fragmentsNeeded=5, while each Boss separately grants a chapter chest. Decide whether both rewards are intentional. Whatever policy is chosen must be idempotent and tested so one Boss defeat cannot double-pay on reload.

### BOSS-W03 — Boss badge field stores localized chapter name, not stable badge ID
- Stage: **Stage 6 / Stage 7**
- Type: `integration-decision`
- Map B01-B06 deterministically to badge_story_ch1...badge_story_ch6. The same badges currently have story-completion conditions, so define whether story completion, Boss defeat, or both can unlock them; use a single idempotent badge transaction.

### BOSS-W04 — Boss cosmetic reward field stores display text, not stable inventory ID
- Stage: **Stage 7**
- Type: `integration-contract`
- A5 already supplies stable logical IDs cosmetic.boss_b01...cosmetic.boss_b06. Persist stable IDs/logical IDs rather than localized strings such as 金色錢包頭像框.

### BOSS-W05 — Boss JSON does not encode unlock conditions
- Stage: **Stage 5 / Stage 7**
- Type: `integration-contract`
- The product spec says every five thinking stories form one chapter and Stage 7 integrates chapter completion/unlock, but BOSSES_6 has no unlock field. Resolve unlock through the existing story/chapter progression service; do not add an array-index-based or arbitrary unlock rule in Boss UI code.

### BOSS-W06 — Boss JSON has no structured parent-confirmation flags
- Stage: **Stage 7 / Stage 8**
- Type: `integration-decision`
- Stage 7 expects parent-confirmed real-world steps when required, but progress nodes only contain step/desc. Decide a consistent policy in the Boss service or config layer. Do not silently mutate canonical Boss content or infer confirmation from Chinese text at runtime.

### BOSS-W07 — Multi-day durations are embedded in challenge prose, not structured fields
- Stage: **Stage 7**
- Type: `implementation-note`
- B01/B03/B06 mention one week; B02/B05 mention three days. Treat these as instructional content unless a future explicit duration schema is approved; do not parse localized prose into timers or deadlines.

### BOSS-N01 — B05 uses the phrase 今日Boss inside its real-world challenge
- Stage: **Stage 7**
- Type: `implementation-note`
- This refers to choosing a daily priority task inside the challenge narrative. Do not recursively launch another chapter Boss or bind this phrase to the Home “今日 Boss” entity without an explicit design rule.

## QA conclusion
`BOSSES_6.json` is structurally coherent and suitable as the Stage 7 canonical Boss content source. No canonical data rewrite is required by this QA. The warnings above are integration-policy decisions: resolve them in services/configuration with stable IDs and idempotent transactions rather than modifying display strings or inventing hidden rules in the UI.
