# Stage 3 task constraints

This note records the pre-Stage-3 A2/A3-1 integration findings. It does not
authorize or implement Stage 3 runtime behavior.

## Canonical task sources

- `02_DATA/reality_tasks_120.json`: 120 general tasks
- `02_DATA/exercise_task_cards_30.json`: 30 exercise tasks
- `02_DATA/chore_task_cards_30.json`: 30 chore tasks
- Expected total: 180 tasks

Canonical category IDs remain unchanged. UI labels and filters must later use
reusable repository/mapping logic rather than rewriting source JSON. The A3-1
candidate aliases are:

- `reading`: `reading_story`
- `english`: `english`
- `exercise`: `exercise`, `exercise_home`
- `chores`: `chores_home`
- `life`: `life`
- `hidden`: no canonical task categories currently map here
- `all`: all canonical categories

Canonical categories without an approved UI alias must remain accessible
through the All view until a mapping is explicitly approved.

## Runtime guardrails for later implementation

- `repeatable=true` must not permit unlimited same-day EXP farming.
- Completion and reward handling must be idempotent.
- Txxx tasks whose names contain “Boss” remain ordinary quest cards; they must
  not enter the official B01-B06 boss state.
- Do not invent hidden quests. The current canonical task data defines none.
- Preserve exercise and chore tips, safety guidance, off-screen behavior, and
  parent-confirmation fields when repositories and UI are implemented.
- Do not change the IndexedDB schema or migrations for these constraints unless
  a concrete Stage 2 compatibility defect is demonstrated.
