# Content validation tool

`validate_content.py` is a development-only validator for the canonical JSON
handoff. It is not imported by the application and is not part of runtime
startup.

Run it from the repository root:

```powershell
npm run validate:content
```

The task checks cover these canonical sources:

- `02_DATA/reality_tasks_120.json`
- `02_DATA/exercise_task_cards_30.json`
- `02_DATA/chore_task_cards_30.json`

The expected task totals are 120 general, 30 exercise, and 30 chore tasks
(180 total). The validator also checks the other canonical content files in
its established validation suite.
