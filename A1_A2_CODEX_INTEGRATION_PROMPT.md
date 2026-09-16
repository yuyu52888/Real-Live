# A1 + A2｜Codex Integration Prompt

將本包解壓到 Real Life Quest repo 根目錄後，貼給 Codex：

```text
Read `AGENTS.md` first.

I added A1 + A2 externally prepared files under `/incoming/chatgpt/`:

A1:
- `/incoming/chatgpt/data/vocabulary-fixtures/`

A2:
- `/incoming/chatgpt/tools/content-validation/`
- `/incoming/chatgpt/reports/data-qa/`

Do not regenerate these files and do not blindly overwrite existing project code.

Task:
1. Inspect only these A1/A2 incoming files and the authoritative vocabulary/content specs they reference.
2. Run:
   python incoming/chatgpt/tools/content-validation/validate_content.py --project-root . --fixtures-root incoming/chatgpt/data/vocabulary-fixtures --report-dir incoming/chatgpt/reports/data-qa
3. Confirm the validator exits 0 and the report says PASS.
4. Keep A1 fixtures as test-only data; they must never appear as production learning content.
5. Integrate the validator into the repo's development/test workflow only if it fits the existing Stage architecture; do not refactor unrelated modules.
6. Do not begin Stage 4 runtime vocabulary implementation merely because A1 is present unless the current Playbook stage calls for it.
7. When Stage 4 arrives, use mock_expansion_300.json and mock_expansion_200.json for the mandatory runtime 300 -> 600 -> 800 test, preserving existing Core WordProgress.
8. Invalid fixtures must be rejected without damaging existing vocabulary/progress data.

Reply only with:
- incoming files reviewed
- validator command/result
- files integrated/changed
- PASS/FAIL
- any schema/contract conflicts
```
