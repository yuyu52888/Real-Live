# Stage 4 Review Fix Prompt

Read `AGENTS.md` first. Work only on branch `stage4-english`.
Do not merge to `main`.

The Stage 4 implementation commit `c7c7f34867296968ee6a14a7ba1a2f034c5308f2` passed its existing tests, but source review found two functional blockers in the child learning modes plus one progress-state correction. Fix only these issues and add targeted regression coverage. Do not redo A1/A3-2 QA, do not refactor unrelated code, and do not implement Stage 5+.

## Blocker 1 — Matching / 記憶翻牌 currently reveals the answer

Current behavior in `js/pages/learn.js` is not an actual matching/memory activity:
- `cueView(..., "matching")` falls through to the default view and displays both the English word and its Chinese meaning.
- `answerView(..., "matching")` then renders Chinese meanings as answer choices.
- Therefore the correct Chinese answer is visibly shown before the child answers.

Required fix:
- Matching mode must not expose the answer in the prompt/cue.
- Implement a genuine English↔Chinese matching interaction using the current session items. A compact pair-matching / memory-flip implementation is acceptable.
- Use stable `wordId` for identity.
- Do not award multiple progress updates for repeated clicks on the same already-resolved pair.
- Keep touch targets >=44 px and tablet layout usable at 768x1024.
- No production artwork is required.

## Blocker 2 — Spelling challenge currently displays the answer word

Current `cueView(..., "spelling")` also falls through to the default view and renders the target English word in the large heading while `answerView` asks the child to type that same word.

Required fix:
- In spelling mode, never display the target English spelling before submission.
- Show an allowed cue instead: Chinese meaning, image/imageCue fallback, and/or listening prompt.
- Keep the pronunciation button available so the child can hear the word.
- After submission, progress may update through the existing answer path.
- Preserve the current unlock rule (`spellingRequired` + sufficiently practiced/unlocked).

## Progress-state correction — wrong first exposure must not remain semantically `unseen`

Current `nextWordProgress(null, word, false, now)` creates a progress record whose state remains `unseen`, even though the word has already been presented and answered.

Required fix:
- First exposure with a wrong answer should transition to at least `seen` while still incrementing `wrongCount`, resetting streak, and scheduling the short retry interval.
- Wrong answers must never reduce an already higher state.

## Required targeted tests

Add/extend tests to prove all of the following:
1. Matching mode does not render the target English+Chinese answer pair together before interaction.
2. Matching requires a real pair match and resolved pairs cannot double-update progress.
3. Spelling mode does not render the target English word before submission.
4. Spelling still supports pronunciation/listening and correct/incorrect submission.
5. A wrong first exposure produces state `seen`, not `unseen`.
6. Existing 300→600→800, pack disable/re-enable, atomic import, speech-rate, Stage 3/A7, persistence regressions remain PASS.
7. Browser smoke covers at least meaning, matching, and spelling flows at 768x1024. If spelling requires unlock state, seed a practiced/unlocked test record rather than weakening production rules.

## Review advisory — do not expand scope unless required

`02_DATA/ENGLISH_MODULE_SPEC.json` defines English-session EXP rules. Do not add a broad reward refactor in this fix unless the existing Stage 4 implementation already intended to award English completion EXP. Keep this review patch focused on the two broken modes and progress-state correctness; session reward wiring can be reviewed separately against the stage plan.

## Verification

Run at minimum:
- `npm run test:stage4`
- `npm test`
- `npm run validate:content`
- existing Stage 3/A7/persistence browser regressions
- `git diff --check`

Commit and push to `origin/stage4-english`.

Reply only with:
- files changed
- fixes implemented
- tests/results
- commit SHA
- push PASS/FAIL
- remaining limitations
