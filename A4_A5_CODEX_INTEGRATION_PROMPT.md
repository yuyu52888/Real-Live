Read `AGENTS.md` first. Work only on integrating the A4/A5 incoming handoff.

New externally prepared files are under:
- `incoming/chatgpt/data/copy/`
- `incoming/chatgpt/assets/manifest/`
- `incoming/chatgpt/tools/a4-a5-validation/`

Rules:
1. Do not regenerate these files and do not blindly overwrite canonical project files.
2. Validate them against `01_SPECS/UI_UX_IMPLEMENTATION_SPEC.md`, `01_SPECS/UI_UX_FLOW_SPEC.md`, `01_SPECS/ART_BIBLE.md`, the canonical JSON data, and the current working code.
3. Run:
   `python incoming/chatgpt/tools/a4-a5-validation/validate_a4_a5.py .`
4. For A4, integrate reusable fixed UI strings only where it fits the current architecture. Do not move canonical content (task/story/boss/vocabulary data) into the copy file. Do not rewrite routing/components just to adopt copy keys.
5. For A5, treat the incoming manifest as a candidate contract. Merge useful logical IDs/fallback rules into the canonical asset system; preserve existing working asset paths and checksums.
6. Missing production art must remain non-blocking through Stage 9. Use the declared fallback/logical-slot behavior instead of adding task-specific business-logic branches.
7. Generic navigation/status icons should remain inline SVG/CSS where practical; do not create bitmap art just because a logical icon exists.
8. Do not modify IndexedDB schema, quest/reward/vocabulary business logic, or unrelated files for this integration.
9. Run the narrowest relevant UI/asset smoke tests after integration.

Reply only with:
- incoming files reviewed
- files integrated/changed
- validator/test results
- PASS/FAIL
- conflicts or deferred items
