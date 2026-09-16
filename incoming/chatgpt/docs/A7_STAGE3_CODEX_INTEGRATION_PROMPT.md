Read `AGENTS.md` first.
Stage 3 is the only runtime scope.

I copied A7 QA fixtures into `/incoming/chatgpt/tests/manual-fixtures/`.
Do not regenerate them and do not blindly turn every manual case into code.

1. Inspect Stage-3 A7 fixtures and `A7_STAGE3_QA_GUIDE.md`.
2. Ignore `DEFERRED_QA_CASES.json` for Stage 3 runtime.
3. Map fixtures to existing quest/repository/service APIs.
4. Convert safe `automation-candidate` cases into narrow regression tests.
5. Keep browser/manual cases as acceptance cases.
6. Do not modify canonical task JSON to satisfy fixtures.
7. Do not add a second persistence layer or reset/recreate IndexedDB.
8. Prioritize blockers: pending/no-early-reward, double-click/reload/multi-tab idempotency, repeatable same-instance anti-farming, persistence, Txxx Boss isolation, no EXP subtraction.
9. If a fixture conflicts with authoritative specs/data, authoritative project data wins; report the mismatch.
10. Run narrow tests first and preserve unrelated edits.

Reply only with:
- A7 files reviewed
- Cases automated
- Cases left manual
- Tests/results
- Blocker coverage
- PASS/FAIL
- Unresolved conflicts
