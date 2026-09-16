# A7 Stage 3 QA mapping

Only Stage 3 cases are mapped here. `DEFERRED_QA_CASES.json` is intentionally
excluded.

## Automated repository/policy checks

- `S3-QA-001`, `002`, `012`, `013`, `014`, `015`, `020`:
  `loadTasks`, `filterTasks`, and `completionInstanceId` in
  `tests/a7-stage3-qa.test.mjs`.

## Automated IndexedDB/service checks

- `S3-QA-005` through `012`, `014`, `016`, `017`, and storage-level coverage
  for `019`: `startQuest`, `requestQuestCompletion`,
  `approveQuestCompletion`, `questHistory`, `approvals`, `transactions`,
  `player`, and `bossProgress` in `tests/a7-stage3-persistence-browser.js`.
- `S3-QA-011` is automated at the service/storage boundary with two live
  connections to one IndexedDB database. The full two-visible-tab interaction
  remains manual.

## Manual/hybrid acceptance retained

- `S3-QA-003`, `004`: visual fidelity, wording, and child-safe presentation.
- `S3-QA-011`: two visible tabs, near-simultaneous user input, then reload both.
- `S3-QA-018`: Network-panel confirmation that the optional photo placeholder
  performs no upload or telemetry.
- `S3-QA-019`: browser Back/Forward interaction. Its storage idempotency
  invariant is automated.
- Visual/interaction portions of `002`, `006`, `008`, `009`, `017`, and `020`
  remain in the manual acceptance checklist while their persistent invariants
  are automated.
