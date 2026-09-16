# Real Life Quest - Codex Agent Guide

## Purpose
Build and maintain Real Life Quest, a tablet-first offline PWA for an approximately 8-year-old child and a parent.
The product turns real-world learning, exercise, chores, persistence, and reflection into visible RPG-style progress without making material rewards the core motivation.

## Read this first
This file is the default entry point for every Codex task.
Do NOT reread the entire repository for every task.
Read only the files needed for the requested change.

## Source-of-truth order
1. Functional/data truth:
   - `01_SPECS/UI_UX_IMPLEMENTATION_SPEC.md`
   - `01_SPECS/VOCABULARY_EXPANSION_SPEC.md`
   - `02_DATA/*.json`
   - `03_REWARDS_BOSSES/*.json`
2. Interaction flow:
   - `01_SPECS/UI_UX_FLOW_SPEC.md`
3. Highest visual/art authority:
   - `01_SPECS/ART_BIBLE.md`
   - governs character identity, pose consistency, task art, bosses, backgrounds, decorations, asset naming, and art acceptance.
4. UI layout/composition references:
   - `04_UI_REFERENCES/*.png`
   - use for page hierarchy, composition, spacing, and art direction; mockup text/numbers are not authoritative data.
5. Current supplied canonical art baseline:
   - `assets/`
   - do not regenerate, redesign, or overwrite supplied character/fox assets unless the user explicitly asks.
6. Full original handoff when a cross-cutting rule is unclear:
   - `00_START_HERE/GPT6_DEVELOPMENT_PROMPT.md`

Conflict rules:
- Functional/data conflicts: JSON/specs win.
- Character/world visual conflicts: `ART_BIBLE.md` wins.
- UI composition: use the approved UI references while preserving functional/data truth.

## Product invariants
- Traditional Chinese UI.
- Tablet-first, touch-first, responsive PWA.
- Male and female protagonist variants share identical progress and game rules.
- Failure never subtracts EXP.
- No leaderboard, ads, social feed, or pay-to-win.
- Math questions are NOT generated in-app; app records process only.
- Exercise/chores move the child off-screen and may require parent approval.
- Cosmetics have no stat bonuses.
- Material rewards are optional and parent-controlled.


## Existing handoff structure
- The repository already contains specs, data, UI references, approved character/fox assets, and empty runtime skeleton folders (`css/`, `js/`, `data/`, `tests/`, `incoming/chatgpt/`).
- Stage 0 should audit and complete this structure; do not delete/recreate authoritative handoff folders or supplied assets.
- Create runtime files only where needed and preserve the handoff source folders (`00_START_HERE` through `06_GUIDES`).

## Technical constraints
- HTML5 + CSS3 + Vanilla JavaScript ES modules.
- PWA + Service Worker + Web App Manifest.
- IndexedDB is the source of truth for persistent app state.
- LocalStorage only for small non-critical UI preferences.
- Offline-first; core MVP must not depend on cloud services.
- No framework migration unless explicitly requested.
- No CDN dependency for core operation.
- Preserve data through schema migrations; never delete/recreate DB as an upgrade strategy.

## Data-driven rules
- Do not hardcode task, story, boss, reward, or vocabulary entries into UI files.
- Never use array index as a persistent ID.
- Vocabulary count must be dynamic. Never create `TOTAL_WORDS = 300` or equivalent.
- Core 300 is pack 1, not a system limit.
- Vocabulary architecture must support at least 2,000 words and future 300-500 word packs.
- `wordProgress` is separate from vocabulary content so pack updates never reset progress.
- Existing progress must survive pack enable/disable/import/update.

## English rules
Read `01_SPECS/VOCABULARY_EXPANSION_SPEC.md` before changing vocabulary storage, scheduling, import, or progress.
Speech defaults: en-US, 0.75x; adjustable 0.60x-1.10x in 0.05 steps.
Audio file wins when available; otherwise use SpeechSynthesis.
Due reviews are prioritized before new words.

## UI rules
Use reusable components and CSS tokens.
Match the hierarchy and feel of `04_UI_REFERENCES/`, but do not copy incorrect mockup values.
Minimum touch target: 44x44 px; primary CTA preferably >=56 px high.
Do not require hover.
Support reduced motion and visible keyboard focus.
Keep reading screens calm; avoid excessive animation.


## Art asset discipline
- `01_SPECS/ART_BIBLE.md` is mandatory for any visual asset work.
- Supplied files under `assets/characters/` and `assets/pets/fox/` are the current canonical character baseline. Reuse them; do not regenerate them by default.
- `boy_master.png`, `girl_master.png`, and `fox_master.png` are canonical reference aliases copied byte-for-byte from the supplied idle poses so Codex has stable master paths.
- Missing production art (exercise/chore-specific illustrations, bosses, backgrounds, badges/decorations) must not block coding. Use clearly marked placeholders and stable asset paths until approved assets arrive.
- New externally prepared files should first enter `incoming/chatgpt/` and be validated before integration.
- Do not bake live UI text, EXP values, counters, buttons, or navigation into illustration images. UI text/state remains HTML/CSS/JS.
- For Stage 1/10 UI work, inspect only the relevant UI reference image(s) plus `ART_BIBLE.md`.

## Coding discipline
- Make the smallest maintainable change that satisfies the task.
- Prefer existing components/services/repositories before creating new ones.
- Avoid duplicate utilities and duplicate business logic.
- Do not perform unrelated refactors.
- Do not reformat untouched files.
- Do not rewrite whole files when a local edit is enough.
- Keep modules focused; avoid giant files.
- Prefer configuration/data over branching per content item.
- Do not minify or compress source to save lines; optimize for maintainability and context efficiency.

## Context/token discipline
- Start from this file and the user task.
- Inspect targeted files first; do not scan every JSON/story/image by default.
- Read the full handoff prompt only for cross-cutting ambiguity.
- For UI changes, inspect only the relevant reference image(s).
- For data changes, sample enough records to validate schema; do not dump entire large files into chat output.
- Do not echo full source files in the final response.

## Verification discipline
For every change:
1. Run the narrowest relevant test/check first.
2. Run broader smoke tests only when the change is cross-cutting or the narrow check passes.
3. Do not claim success without verification.
4. Report failures clearly; fix obvious failures before returning.

Mandatory high-risk regression areas:
- EXP idempotency / no double reward.
- IndexedDB persistence across reload.
- Parent approval state.
- Backup/restore.
- Offline launch.
- Vocabulary 300 -> 600 -> 800 extension without progress loss.

Acceptance reference:
- `05_TESTS/ACCEPTANCE_TESTS.md`

## Safety/privacy
- Exercise has clear stop/safety guidance; no medical or fitness diagnosis.
- Chores involving blades, heat, height, chemicals, or heavy loads are not default child-solo tasks.
- Task photos stay local in the MVP and are optional.
- Never add external telemetry, analytics, uploads, or network services without explicit instruction.

## Git/worktree discipline
- Keep each task scoped to one logical change.
- Review `git diff` before completion.
- Never discard user changes.
- If the repository already has unrelated edits, preserve them and avoid touching those files.
- Use a separate branch/worktree for parallel tasks when available.

## Completion response
Keep the final Codex response short. Report only:
1. Files changed.
2. What was implemented/fixed.
3. Tests/checks run and result.
4. Remaining limitation or next action, if any.

Do not restate the entire project specification.
