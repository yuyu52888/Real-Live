# Art Assets Status

## Ready now
- Male protagonist pose pack
- Female protagonist pose pack
- Fox companion pose pack
- Canonical `*_master.png` reference aliases are provided for stable asset paths.
- All supplied PNG assets have alpha transparency and are suitable for UI layering.
- `ASSET_MANIFEST.json` maps ready and pending art through stable logical IDs and declared fallbacks.

## Art authority
Always read `01_SPECS/ART_BIBLE.md` before generating or integrating new artwork.

## Non-blocking future assets
The following production asset sets are not yet included: exercise-specific illustrations, chore-specific illustrations, bosses, chapter/background art, badges/icons/decorations, and optional vocabulary images.

Do **not** stop Stage 0-9 development waiting for these images. Resolve the logical slot through its declared character or CSS fallback. Approved art can replace the same logical slot during the parallel asset track without changing business logic, then be polished in Stage 10.

## Important
Do not place live UI text, EXP, counters, buttons, or navigation inside illustration PNGs. Those remain real HTML/CSS/JS UI.
