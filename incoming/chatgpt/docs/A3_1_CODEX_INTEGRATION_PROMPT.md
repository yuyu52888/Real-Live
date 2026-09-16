# Real Life Quest｜A3-1 Tasks QA → Codex integration prompt

Read `AGENTS.md` first.

A3-1 task-data QA has been added under:

`/incoming/chatgpt/reports/data-qa/`

Relevant files:
- `A3_1_TASKS_QA_REPORT.md`
- `A3_1_TASKS_QA_REPORT.json`
- `TASK_CATEGORY_UI_ALIAS_RECOMMENDATION.json`

This handoff contains QA findings only. It intentionally does **not** replace the canonical task JSON files.

When you are preparing or implementing Stage 3:

1. Read the A3-1 QA report before changing task repository/filter behavior.
2. Treat these files as canonical task content and do not rewrite category values in-place:
   - `02_DATA/reality_tasks_120.json`
   - `02_DATA/exercise_task_cards_30.json`
   - `02_DATA/chore_task_cards_30.json`
3. Preserve canonical source categories. Implement UI aliases in the repository/filter layer only.
4. Known safe UI aliases are documented in `TASK_CATEGORY_UI_ALIAS_RECOMMENDATION.json`.
5. Do not map currently-unmapped canonical categories to another visible tab unless an explicit product rule exists. They remain visible under `All`.
6. Do not treat `repeatable=true` as permission for unlimited same-day EXP. Preserve idempotent completion/reward transaction behavior and add an appropriate repeat policy/cooldown without changing the canonical card content.
7. Keep Txxx task records whose display names contain “Boss” separate from formal B01-B06 Boss progress/reward state.
8. Preserve `requiresParentConfirmation=true` on all dedicated exercise/chore cards.
9. Do not generate math questions in-app. `math_process` is process tracking only.
10. Do not fabricate hidden-task records simply because the UI has a Hidden tab.
11. Do not modify unrelated files or perform broad refactors.

Run the narrowest Stage 3 tests that cover:
- all 180 task records load;
- IDs stay unique;
- category filters/aliases work;
- exercise and chore cards go to parent approval;
- repeated completion cannot issue duplicate EXP;
- Boss-named Txxx tasks do not enter B01-B06 boss state.

Reply only with:
- QA files reviewed;
- repository/filter changes made, if any;
- tests run and PASS/FAIL;
- unresolved conflicts or product decisions needed.
