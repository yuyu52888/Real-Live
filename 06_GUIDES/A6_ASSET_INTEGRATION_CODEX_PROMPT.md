# A6 Production Art Integration — Codex Execution Prompt

Work on branch `stage7-boss` only.
Read `AGENTS.md` first.
Do not merge `main`.

The A6 art upload is already present under `incoming/chatgpt/assets/a6/`. The previous EX007/EX010 filename mistakes have been corrected. This task is **asset reconciliation/integration only**. Do not redesign Stage 3–6 behavior and do not implement Stage 7 Boss logic yet.

Read first:

- `06_GUIDES/A6_ASSET_INTEGRATION_AUDIT.md`
- `assets/ASSET_MANIFEST.json`
- `assets/README_ASSETS.md`
- `01_SPECS/ART_BIBLE.md`
- canonical source JSON under `02_DATA/` and `03_REWARDS_BOSSES/`

## Goal

Promote all 130 A6 production-art files from staging into the existing canonical asset contract so the repository ends with 167/167 ready assets (37 existing character/pet + 130 A6), without creating a second set of canonical paths.

## Staging inventory expected

- exercise: 30 (`EX001`–`EX030`)
- chore: 30 (`CH001`–`CH030`)
- story: 30 (`S01`–`S30`)
- backgrounds: 7
- bosses: 6 (`B01`–`B06`)
- badge: 12
- cosmetic: 15

Total: 130.

Before modifying anything, verify those counts and exact semantic coverage. Abort and report if any required logical slot is missing or ambiguous.

## Critical path rule

The existing `assets/ASSET_MANIFEST.json` canonical `path` wins over the incoming filename/path whenever they differ.

Example: do NOT decide that `incoming/.../exercise_ex001.png` should become `assets/exercise/exercise_ex001.png` if the current manifest for `task.exercise.EX001` declares a different canonical descriptive filename. Promote to the existing manifest path.

Do not infer semantic meaning from image pixels. Resolve through stable logical/content IDs and canonical source records.

## Required integration

For each of the 130 currently-pending A6 manifest entries:

1. identify exactly one staging PNG;
2. place that PNG at the current manifest entry's canonical `path`;
3. leave `logicalId`, `contentId`, `sourceFile`, source semantics and canonical path stable;
4. update manifest `status` to `ready`;
5. compute and record actual file metadata from the final file:
   - width
   - height
   - mode (RGB/RGBA as applicable)
   - transparency
   - SHA-256
6. ensure a ready asset resolves directly rather than through its fallback;
7. do not duplicate or overwrite the already-ready character/pet baseline unless exact byte/contract validation proves it is intentional.

Use deterministic scripting if helpful. Prefer adding a small validation script under `tools/` rather than performing 130 opaque manual edits if that improves repeatability.

## Staging cleanup

After all 130 files are successfully validated at their canonical final paths:

- remove the promoted PNG copies from `incoming/chatgpt/assets/a6/` so the repository does not carry duplicate production binaries;
- remove empty A6 staging directories if appropriate;
- keep audit/report/contract text files if useful for traceability.

Do not delete unrelated `incoming/chatgpt/` material.

## Manifest summary

After integration:

- total = 167
- ready = 167
- pending = 0
- by-kind totals remain unchanged
- existing 37 character/pet ready entries remain intact
- `productionArtStillPending` must no longer claim that the newly supplied exercise/chore/story/Boss/background/badge/cosmetic A6 art is missing. Optional vocabulary imagery may remain future work if it is outside the 167-slot contract.

Do not rewrite the entire manifest into a new schema.

## Runtime integration

Inspect `js/services/asset-registry.js` and current consumers.

The intended architecture is unchanged:

- runtime requests logical IDs;
- registry reads the manifest;
- `ready` assets resolve to canonical production paths;
- fallback is used only if not ready/missing.

Do not add runtime reads from `incoming/`.

Update narrow tests/browser expectations that explicitly depended on A6 assets being pending. In particular, Story smoke tests must no longer require `fox_reading.png` when `story.S01` is now ready. Add/adjust narrow assertions proving production resolution for at least:

- one exercise asset (EX001)
- one chore asset (CH001)
- one story asset (S01)
- one Boss asset (B01)
- one badge and one Boss cosmetic logical ID

Do not redesign page layout in this pass.

## Validation

Run:

1. asset-integrity validation that proves:
   - 167 manifest entries
   - 167 ready
   - 0 pending
   - every ready path exists
   - unique logical IDs
   - one-to-one final file mapping
   - actual SHA-256/metadata match manifest
   - no A6 promoted PNG duplicates remain in staging
2. `npm run validate:content`
3. `npm test`
4. `npm run check`
5. relevant browser/persistence smoke tests affected by asset expectations
6. `git diff --check`

Do not implement Stage 7 Boss progress/reward logic in this pass.

## Commit/push

Commit with:

`feat: integrate A6 production art assets`

Push normally to:

`origin/stage7-boss`

Do not force push.
Do not merge `main`.

Reply only with:

- verified staging counts
- files promoted / staging cleanup
- manifest ready/pending totals
- asset validation result
- tests/results
- commit SHA
- push PASS/FAIL
- any remaining issue
