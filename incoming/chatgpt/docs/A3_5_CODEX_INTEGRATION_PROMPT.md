# A3-5 → Codex Stage 7 integration prompt

Read `AGENTS.md` first. Work only on the Boss integration concerns relevant to Stage 7.

I added externally prepared A3-5 Boss QA files under `/incoming/chatgpt/`:
- `reports/data-qa/A3_5_BOSS_QA_REPORT.md`
- `reports/data-qa/A3_5_BOSS_QA_REPORT.json`
- `data/boss-fixtures/BOSS_RESOLUTION_RECOMMENDATION.json`

Authoritative content remains:
- `03_REWARDS_BOSSES/BOSSES_6.json`
- `03_REWARDS_BOSSES/REWARD_SYSTEM.json`
- existing story/chapter progression data and services
- canonical asset manifest already integrated in the repo

Tasks:
1. Review the A3-5 report before implementing/finalizing Stage 7.
2. Do NOT rewrite Boss story/challenge/progress/reward display content merely to remove the warnings.
3. Use stable IDs for persistence and transactions:
   - B01..B06 for Boss state;
   - badge_story_ch1..badge_story_ch6 for chapter badge resolution;
   - boss.B01..boss.B06 for Boss art;
   - cosmetic.boss_b01..cosmetic.boss_b06 for Boss cosmetic rewards.
4. Keep Boss progress and defeat state persistent and idempotent. Reload, repeated clicks, or reopening a defeated Boss must not grant rewards twice.
5. Resolve or explicitly document these policies rather than silently guessing:
   - chapter chest pool/resolution;
   - whether Boss victory gives both 5 fragments and the explicit chapter chest;
   - whether chapter badges unlock on story completion, Boss defeat, or both idempotently;
   - Boss unlock condition via existing chapter/story progression;
   - parent-confirmation policy for real-world Boss steps.
6. Do not parse localized challenge prose into timers/deadlines.
7. B05 phrase `今日Boss` is challenge prose; do not recursively launch a Boss entity unless an explicit design rule says so.
8. Keep pending Boss/cosmetic artwork non-blocking and use the existing A5 fallbacks until Stage 10.
9. Run targeted tests for:
   - six Bosses data load;
   - HP equals progress steps;
   - step persistence after reload;
   - defeated state persistence;
   - one Boss defeat -> one reward transaction only;
   - stable badge/cosmetic resolution;
   - chapter unlock behavior.

Do not perform unrelated refactors.
Report only: files changed, policy decisions/resolutions, tests/results, unresolved items.
