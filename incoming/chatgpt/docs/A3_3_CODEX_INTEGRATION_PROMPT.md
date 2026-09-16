# A3-3 → Stage 5 Codex Integration Prompt

Read `AGENTS.md` first. Work only on integrating the A3-3 Story QA findings relevant to Stage 5.

Incoming files:
- `/incoming/chatgpt/reports/data-qa/A3_3_STORY_QA_REPORT.md`
- `/incoming/chatgpt/reports/data-qa/A3_3_STORY_QA_REPORT.json`

Canonical sources remain:
- `02_DATA/thinking_stories_30.json`
- `03_REWARDS_BOSSES/BOSSES_6.json`
- `03_REWARDS_BOSSES/REWARD_SYSTEM.json`
- `04_UI_REFERENCES/06_thinking_story.png`

Do not rewrite or shorten canonical story content merely to fit the reference mockup.

Required implementation constraints:
1. Use `thinking_stories_30.json` as immutable canonical content; the app must not generate stories dynamically.
2. Use stable `S01`–`S30` story IDs as identity. Never use array index as a persistent story-progress key.
3. Resolve chapters deterministically in five-story groups (`S01-S05` => chapter 1 ... `S26-S30` => chapter 6) and resolve chapter names/Boss metadata from `BOSSES_6.json` or one immutable resolver. Do not mutate story JSON just to add chapter fields.
4. Reader must support variable content length. S01/S02/S03 are longer than the 500–700 target band and must not be truncated automatically.
5. Show exactly four reflection questions, one real-world task, and one thought card (`takeaway`) per story.
6. Questions are reflection/application prompts, not scored trivia. Do not add name/detail-memory quizzes.
7. Store story progress separately from immutable story content.
8. Rereading is allowed, but first completion/chapter progression/reward must be idempotent across double-click, reload, and revisit.
9. Do not invent a hardcoded per-story EXP value in StoryReader. Story JSON does not define one; route rewards through the shared reward transaction/config layer and preserve compatibility with Stage 6.
10. Keep real-world tasks low-screen and off-screen in spirit; no unnecessary extra form flow.
11. Do not modify unrelated modules or perform broad refactors.

Before marking Stage 5 PASS, prove with narrow tests/self-tests:
- all 30 stories load from JSON;
- S01 and a normal-length story both render without truncation;
- each story shows 4 questions + 1 reality task + 1 takeaway;
- completion persists across reload;
- chapter progress is correct at boundaries S05/S06, S10/S11, S25/S26, S30;
- repeated completion does not duplicate first-completion progress/reward;
- story progress keys are stable IDs, not array indexes;
- 6 five-story groups align with B01-B06 chapter metadata.

Reply only with:
- incoming QA reviewed;
- files changed;
- tests run/results;
- chapter-boundary test result;
- idempotency result;
- PASS/FAIL;
- unresolved conflicts.
