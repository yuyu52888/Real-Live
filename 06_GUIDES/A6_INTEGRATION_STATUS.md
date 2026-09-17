# A6 Asset Integration Status

Work branch: `a6-integration`

This branch is reserved for reconciling the completed A6 artwork against the repository asset contract before promoting files from `incoming/chatgpt/assets/a6/` into canonical `assets/...` paths.

Rules:
- Do not duplicate already-canonical character/pet assets.
- Reconcile Boss art against the current `ASSET_MANIFEST.json` instead of creating a second naming scheme.
- Validate exact counts and filenames before promotion.
- Preserve `assetId + sourceFile + sourceId` semantics from the A6 asset map.
