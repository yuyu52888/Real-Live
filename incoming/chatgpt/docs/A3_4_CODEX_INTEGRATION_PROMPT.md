# A3-4 Codex Integration Prompt

Read `AGENTS.md` first. Work only on the A3-4 Reward QA handoff.

I copied externally prepared files into `/incoming/chatgpt/`:
- `reports/data-qa/A3_4_REWARD_QA_REPORT.md`
- `reports/data-qa/A3_4_REWARD_QA_REPORT.json`
- `data/reward-fixtures/REWARD_TICKET_ALIAS_RECOMMENDATION.json`

Do not modify Stage 1/2 code just to integrate this report. If Stage 6 has not started, treat these files as future implementation guidance and leave them under `/incoming/chatgpt/`.

When Stage 6 begins:
1. Re-read `03_REWARDS_BOSSES/REWARD_SYSTEM.json` as canonical reward truth.
2. Preserve the approved Lv1-Lv10 thresholds, chest weights, material-reward policy, and cosmetic-only rules.
3. Implement claim-once/idempotent EXP, level reward, chest, badge/title and ticket transactions.
4. Normalize level-reward ticket SKUs through the alias recommendation instead of creating accidental duplicate ticket inventory types.
5. Do NOT silently map `mystery_unlock`; it has no canonical `tickets[]` entry. Report it as a design/data decision unless an approved canonical revision exists by then.
6. Explicitly decide/test the Boss reward interaction: `bossWin=5` fragments versus each Boss's explicit `chapter` chest. Do not accidentally double-award.
7. Resolve badges by stable IDs, not display names; do not duplicate the same chapter badge due to story completion and Boss reward paths.
8. Treat localized chest-pool item strings as display/design outcomes, not durable inventory primary keys.
9. Run narrow reward tests including repeated click, reload, duplicate transaction, disabled material reward, and ticket alias normalization.

Do not rewrite canonical JSON merely to make tests easy. Do not touch unrelated modules.

Reply only with:
- incoming files reviewed
- files changed
- tests run/results
- PASS/FAIL
- unresolved reward decisions
