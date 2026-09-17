# A6 Art Asset Integration Audit

Status: READY FOR LOCAL INTEGRATION

## Current repository state

The A6 production-art upload is present under `incoming/chatgpt/assets/a6/` on the current baseline.

Verified staging categories and expected counts:

- `exercise/`: 30 files, EX001–EX030; the previously malformed EX007/EX010 filenames have been corrected.
- `chore/`: 30 files, CH001–CH030.
- `story/`: 30 files, S01–S30.
- `backgrounds/`: 7 files (home + chapter 01–06).
- `bosses/`: 6 files, B01–B06.
- `badge/`: 12 files.
- `cosmetic/`: 15 files.

Total staged A6 assets to promote: **130**.

The existing formal character/pet baseline remains separate and must not be duplicated or replaced unless an exact asset-contract match is intentionally verified:

- character poses: 26
- fox/pet poses: 11
- existing ready baseline: 37

Therefore, after successful A6 promotion the manifest should represent **167/167 ready assets** (37 existing + 130 newly promoted), with zero A6 pending entries.

## Canonical-path reconciliation rule

`assets/ASSET_MANIFEST.json` is the current repository contract and wins when its canonical path differs from an incoming A6 filename/path. Do not create a second runtime asset namespace just because the staging filename is shorter.

Examples:

- incoming `exercise/exercise_ex001.png` must resolve to the existing manifest entry for `task.exercise.EX001`, whose canonical path may include a descriptive suffix.
- incoming Boss files use long descriptive staging names; they must be promoted to the canonical path already declared for `boss.B01` … `boss.B06`.

Semantic identity is determined by logical ID/content ID and canonical source records, not by guessing from pixels.

## Formalization requirements

For every A6 pending manifest entry:

1. resolve one and only one staging source file;
2. copy/move its bytes to the existing manifest `path`;
3. preserve the logical ID and canonical path;
4. mark the manifest entry `ready`;
5. populate/refresh actual metadata from the file (PNG dimensions, RGBA/RGB mode, transparency, SHA-256);
6. keep fallback metadata harmless but do not make runtime choose fallback for a ready asset;
7. reject missing, duplicate, ambiguous, or extra semantic mappings;
8. do not alter canonical task/story/Boss JSON.

After successful promotion, remove only the promoted staging PNGs (or the now-empty A6 staging directories) so the repository does not retain two production copies. Keep any integration report/contract docs that are useful for traceability.

## Runtime/test impact

Existing asset consumers should now resolve production art instead of fallbacks where the logical slot already exists. Update tests that explicitly expected pending fallbacks (for example Story cover → fox-reading fallback) so they assert the production logical asset instead.

Do not redesign UI in this pass. Stage 10 still owns visual sizing/composition refinement.

## Stage 7 impact

Stage 7 Boss implementation should consume `boss.B01` … `boss.B06` through the asset registry and may use the six Boss cosmetics by stable logical IDs. It must not read from `incoming/chatgpt/assets/a6/` at runtime.

## Acceptance gate

A6 integration passes only if:

- all 130 staged A6 files map one-to-one to 130 previously-pending manifest entries;
- no character/pet duplication is introduced;
- manifest totals are 167 ready / 0 pending;
- every ready manifest path exists;
- no promoted staging PNG remains duplicated under `incoming/chatgpt/assets/a6/`;
- asset-registry validation passes;
- content validator and existing Stage 0–6 regression remain green;
- browser smoke uses production art for at least exercise, chore, story, and the Boss asset resolver contract.
