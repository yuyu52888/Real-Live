# A6 Integration Plan

1. Audit incoming A6 folders and exact filenames/counts.
2. Compare against `assets/ASSET_MANIFEST.json` canonical logical IDs/paths.
3. Preserve existing canonical character/pet assets; do not duplicate them.
4. Promote verified A6 exercise/chore/story/background/badge/cosmetic/Boss files to the manifest-declared canonical paths.
5. Update `assets/ASSET_MANIFEST.json` statuses/paths/checksums only after the binary mapping is verified.
6. Run repository/static validation and then merge the A6 integration into `main`.
7. Rebase/fast-forward Stage 7 work from the updated `main` and update the Stage 7 implementation prompt to use ready Boss art rather than fallbacks.
