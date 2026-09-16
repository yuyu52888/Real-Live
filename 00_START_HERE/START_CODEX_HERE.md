# START CODEX HERE — Real Life Quest

This folder is the coding-ready handoff project root.

## First launch
1. Open **this project root** in Codex Desktop. Do not open the ZIP itself.
2. Confirm Codex can see `AGENTS.md`.
3. Use `06_GUIDES/Real_Life_Quest_Codex_Execution_Playbook_v1.1.docx`.
4. Start with **Stage 0** only.
5. Recommended for Stage 0: **GPT-5.6 Sol / Medium** (or the closest current equivalent if model names change).
6. Complete Codex self-check + your manual checks before Stage 1.

## Important additions already prepared
- `01_SPECS/ART_BIBLE.md` is the highest visual authority.
- `04_UI_REFERENCES/` contains the seven approved result mockups for layout/composition.
- `assets/characters/` and `assets/pets/fox/` contain the current canonical character baseline.
- Empty runtime folders already exist; Stage 0 should audit/complete them, not delete the handoff materials.

## First prompt
Use the **Stage 0 prompt in the v1.1 Playbook** exactly as the main task prompt. Because it starts with `Read AGENTS.md first`, Codex will automatically inherit the Art Bible, current asset, and conflict rules.

## Parallel art/content work
New ChatGPT-produced files should be placed under `incoming/chatgpt/` first, then integrated by Codex using the playbook's incoming-file integration prompt.
