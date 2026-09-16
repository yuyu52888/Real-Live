# Codex Sequential Execution Prompts

All prompts below assume the repository root contains `AGENTS.md`.
For every task, tell Codex to read `AGENTS.md` first and then only the listed files.

## Global low-context prefix
Use this prefix for every task:

> Read `AGENTS.md` first. Work only on the task below. Read only the files needed for this task; do not rescan the whole repository. Make the smallest maintainable change, preserve unrelated user edits, run the narrowest relevant tests first, and do not paste full source files in your reply. Finish by reporting files changed, implementation summary, tests/results, and remaining issues only.

## Stage 0 - Repository bootstrap and audit
Read: `AGENTS.md`, `PROJECT_MANIFEST.json`, `00_START_HERE/START_CODEX_HERE.md`, `00_START_HERE/README_START_HERE.md`.
Goal: create the runnable project skeleton, Git baseline, README commands, placeholder assets, and an implementation status checklist without implementing all features.

## Stage 1 - UI shell and onboarding
Read: `AGENTS.md`, `01_SPECS/UI_UX_IMPLEMENTATION_SPEC.md`, `01_SPECS/ART_BIBLE.md`, UI refs 01-02, current `assets/`.
Goal: router, CSS tokens, bottom navigation, welcome, boy/girl avatar selection, nickname, parent PIN/setup, responsive shell.

## Stage 2 - Persistence foundation
Read: `AGENTS.md`, relevant sections of `00_START_HERE/GPT6_DEVELOPMENT_PROMPT.md` only if needed.
Goal: IndexedDB schema, repositories, migrations, settings, player persistence, safe reset for dev only, backup primitives.

## Stage 3 - Quest engine
Read: `AGENTS.md`, `02_DATA/reality_tasks_120.json`, `02_DATA/exercise_task_cards_30.json`, `02_DATA/chore_task_cards_30.json`, UI refs 02/04/05.
Goal: dynamic quest loading, filters, detail pages, exercise counters/timers, chore steps, completion state, parent approval queue, idempotent EXP transaction.

## Stage 4 - English engine and extensible vocabulary
Read: `AGENTS.md`, `01_SPECS/VOCABULARY_EXPANSION_SPEC.md`, `01_SPECS/vocabulary-pack.schema.json`, `02_DATA/core300_words_enriched.json`, `02_DATA/ENGLISH_MODULE_SPEC.json`, UI ref 03.
Goal: pack loader, vocabulary repository, separate progress, review scheduler, speech controls, core learning modes, import manager foundation.
Required test: 300 -> 600 -> 800 words without code changes or progress loss.

## Stage 5 - Thinking stories
Read: `AGENTS.md`, `02_DATA/thinking_stories_30.json`, UI ref 06.
Goal: story list/reader, readable typography, questions, real-world task, thought card, completion and chapter progress.

## Stage 6 - Rewards/levels/cosmetics
Read: `AGENTS.md`, `03_REWARDS_BOSSES/REWARD_SYSTEM.json`.
Goal: level thresholds, reward transactions, treasure fragments/chests, titles, badges, tickets, cosmetics inventory. No stat bonuses.

## Stage 7 - Boss system
Read: `AGENTS.md`, `03_REWARDS_BOSSES/BOSSES_6.json`, UI ref 07.
Goal: boss screen, HP/progress steps, persistent progress, one-time rewards, chapter completion.

## Stage 8 - Parent mode and weekly report
Read: `AGENTS.md`, relevant UI spec sections, current repositories/services.
Goal: PIN gate, approval queue, settings, category toggles, rest day, speech limits, vocabulary pack manager, weekly report.

## Stage 9 - PWA/offline/backup
Read: `AGENTS.md`, current app shell and DB modules.
Goal: manifest, service worker, app-shell/data caching, installability, offline launch, JSON export/restore, safe validation/migration.

## Stage 10 - Visual refinement
Read: `AGENTS.md`, `01_SPECS/ART_BIBLE.md`, all UI references only for this stage, current approved `assets/`, existing CSS/components.
Goal: bring implemented UI closer to approved art direction without changing business rules. Fix tablet portrait first, then landscape/mobile.

## Stage 11 - Full QA and release candidate
Read: `AGENTS.md`, `05_TESTS/ACCEPTANCE_TESTS.md`, current README/tests.
Goal: run acceptance tests, fix failures, document known limitations, create release checklist, confirm 300->600->800 vocabulary test, persistence, no double EXP, offline, backup/restore.
