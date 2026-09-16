# A3-2 → Stage 4 Codex Integration Prompt

Read `AGENTS.md` first. Work only on integrating the A3-2 English QA findings relevant to Stage 4.

Incoming files:
- `/incoming/chatgpt/reports/data-qa/A3_2_ENGLISH_QA_REPORT.md`
- `/incoming/chatgpt/reports/data-qa/A3_2_ENGLISH_QA_REPORT.json`

Also use the existing A1 fixtures already placed under `/incoming/chatgpt/data/vocabulary-fixtures/`.

Do not rewrite the canonical Core 300 content merely to make it look like the future pack schema. Preserve source data and implement an adapter/loader.

Required implementation constraints:
1. Treat `02_DATA/core300_words_enriched.json` as the canonical Core 300 source. Do not also import `core300_words.json`.
2. Wrap/transform Core 300 into builtin pack `core300-zhTW` at the repository/import boundary.
3. Generate stable global IDs as `core300-zhTW:<legacyId>` and never use array index as identity.
4. Keep `WordProgress` separate from vocabulary content. Legacy `mastery`, counters, and review timestamps in the Core JSON must not become mutable vocabulary content state.
5. Do not hardcode total 300 in UI or logic.
6. Use the A1 legal +300 and +200 packs to prove 300 -> 600 -> 800 with existing progress preserved.
7. Disabling a pack must stop new scheduling without deleting history/progress; re-enable must restore it.
8. Use one global speech-rate preference for word, example sentence, and listening quiz.
9. Do not deduplicate vocabulary by Chinese meaning or example sentence. Identity is `wordId`.
10. Do not modify unrelated modules or perform broad refactors.

Before marking Stage 4 PASS, run the narrow tests that prove:
- Core 300 loads once;
- learn/progress 10 Core words;
- import +300 => total 600;
- those 10 progress records remain unchanged;
- import +200 => total 800;
- disable/re-enable a pack preserves progress/history;
- invalid A1 fixtures fail safely without corrupting installed packs;
- speech rate persists and applies to word/example/listening modes.

Reply only with:
- incoming QA reviewed;
- files changed;
- tests run/results;
- 300/600/800 result;
- PASS/FAIL;
- unresolved conflicts.
