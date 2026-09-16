# Real Life Quest — A3-4 Reward QA Report v1.0

**Result: 56/56 checks PASS · 0 FAIL · 5 integration notes**

Scope: `03_REWARDS_BOSSES/REWARD_SYSTEM.json`, plus reward-focused cross-checks against `BOSSES_6.json` and the approved EXP/Reward rules.

No canonical JSON was modified. Integration notes are recommendations for Stage 6/7 implementation.

## Core validation
- ✅ **REWARD_SYSTEM is object**
- ✅ **required top-level key: designPrinciples**
- ✅ **required top-level key: levelThresholds**
- ✅ **required top-level key: levelRewards**
- ✅ **required top-level key: chestSystem**
- ✅ **required top-level key: titles**
- ✅ **required top-level key: badges**
- ✅ **required top-level key: privilegeRewards**
- ✅ **required top-level key: tickets**
- ✅ **required top-level key: cosmetics**
- ✅ **required top-level key: materialRewardPolicy**
- ✅ **level thresholds exactly match approved Lv1-Lv10 economy** — [(1, 0), (2, 30), (3, 65), (4, 105), (5, 150), (6, 200), (7, 255), (8, 315), (9, 380), (10, 450)]
- ✅ **level thresholds strictly increase after Lv1**
- ✅ **level numbers are sequential 1-10**
- ✅ **level rewards exist for Lv2-Lv10 exactly**
- ✅ **every level reward choose=1**
- ✅ **every level reward has exactly 3 options**
- ✅ **all level reward option types are approved**
- ✅ **level reward option IDs are unique**
- ✅ **all level reward options have non-empty name**
- ✅ **material_optional is a minority of level reward options** — 1/27=0.037
- ✅ **material_optional appears only at long-term milestone Lv10**
- ✅ **5 fragments needed per normal chest**
- ✅ **challenge task grants 1 fragment**
- ✅ **boss win grants 5 fragments**
- ✅ **hidden task chance is 15%**
- ✅ **chest type IDs are unique**
- ✅ **normalChestPool weights sum to 100** — 100
- ✅ **normalChestPool weights are positive**
- ✅ **normalChestPool entries have item choices**
- ✅ **bossChestPool weights sum to 100** — 100
- ✅ **bossChestPool weights are positive**
- ✅ **bossChestPool entries have item choices**
- ✅ **titles IDs are unique**
- ✅ **titles names are unique**
- ✅ **titles entries have required text**
- ✅ **badges IDs are unique**
- ✅ **badges names are unique**
- ✅ **badges entries have required text**
- ✅ **tickets IDs are unique**
- ✅ **tickets names are unique**
- ✅ **tickets entries have required text**
- ✅ **cosmetic slots are unique**
- ✅ **cosmetic rules explicitly forbid stat bonuses**
- ✅ **cosmetics remain permanently unlocked**
- ✅ **material reward max ratio is <=20%**
- ✅ **material rewards default disabled**
- ✅ **material policy warns against task-to-cash/toy exchange**
- ✅ **design principles say failure does not remove EXP/rewards**
- ✅ **design principles say cosmetics have no ability bonus**
- ✅ **reward JSON contains no negative numeric values**
- ✅ **six official bosses present for reward cross-check**
- ✅ **boss reward EXP stays in approved 10-15 range**
- ✅ **all bosses grant a known chest type**
- ✅ **all boss reward badge labels resolve to an existing badge name**
- ✅ **all boss reward cosmetics are non-empty**

## Integration notes / non-blocking gaps
### RWD-W01 — Level reward ticket IDs are SKUs/aliases, not canonical inventory ticket IDs
**Relevant stage:** Stage 6

Level options use reroll_1, bonus_exp_2, quest_skip, double_exp, mystery_unlock, rest_card, reroll_3 while tickets[] defines reroll, skip, boss_retry, bonus2, double, rest. Stage 6 must normalize these before inventory persistence; do not create seven accidental new ticket types.

### RWD-W02 — Boss victory currently implies both 5 fragments and an explicit chapter chest if both rules are applied
**Relevant stage:** Stage 6 / Stage 7

fragmentSources.bossWin=5 is enough for one normal chest, while every B01-B06 reward explicitly grants chest="chapter". RewardService needs an explicit policy on whether both are intended; do not silently double-award or discard one path.

### RWD-W03 — Boss rewards reference badge display names, while badge catalog uses stable IDs and story-completion conditions
**Relevant stage:** Stage 6 / Stage 7

BOSSES_6.json stores badge labels such as 金錢森林, but REWARD_SYSTEM uses IDs badge_story_ch1...badge_story_ch6 with conditions based on completing stories 1-5, 6-10, etc. Stage 6/7 should resolve by stable ID and define whether badge issuance occurs on story chapter completion, Boss defeat, or both idempotently.

### RWD-W04 — Chest pool item entries are localized labels/categories rather than persistent item IDs
**Relevant stage:** Stage 6

Treat chest pool strings as design outcomes/categories to resolve through RewardService, not as durable inventory primary keys. Persist stable generated reward/asset IDs instead of localized display text.

### RWD-N01 — Material reward filtering must preserve a valid Lv10 choice set
**Relevant stage:** Stage 6

When materialRewardPolicy.defaultEnabled=false, hide/disable only the small_gift option. Lv10 still has cosmetic and privilege choices, so choose=1 remains satisfiable. This is expected behavior, not a data error.

## Stage 6 implementation invariants

- `REWARD_SYSTEM.json` remains canonical; do not rewrite it merely to match UI code.
- Persist EXP changes as idempotent transactions (`transactionId`, `sourceType`, `sourceId`, `amount`, `createdAt`).
- Level-up rewards must be claim-once per level and must survive reload.
- Material rewards stay disabled unless parent settings explicitly enable them.
- Cosmetics never change stats/abilities.
- Chest opening must be claim-once/idempotent; reload or double-click must not reroll or duplicate rewards.
- Ticket inventory must normalize reward-option aliases to canonical ticket IDs before persistence.
- Localized names are display text, not durable primary keys.

## Recommendation

Reward data is suitable for Stage 6 implementation. The four integration notes above should be handled in RewardService/repository logic or explicitly resolved before Stage 6 is declared final PASS. The unresolved `mystery_unlock` ticket deserves an explicit design decision rather than an invented mapping.
