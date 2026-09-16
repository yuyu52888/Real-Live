# Real Life Quest｜Codex / GPT-6 開發交接包 v1.1 FINAL

## 從這裡開始

用 Codex Desktop 開啟整個專案根目錄；先讀 `00_START_HERE/START_CODEX_HERE.md`。

第一個正式開發任務請使用 `06_GUIDES/Real_Life_Quest_Codex_Execution_Playbook_v1.1.docx` 的 **Stage 0 Prompt**。每次任務都先讓 Codex 讀 `AGENTS.md`。

## 正式資料來源

- 英文：`02_DATA/core300_words_enriched.json`
- 思維故事：`02_DATA/thinking_stories_30.json`
- 一般任務：`02_DATA/reality_tasks_120.json`
- 運動：`02_DATA/exercise_task_cards_30.json`
- 家事：`02_DATA/chore_task_cards_30.json`
- 獎勵：`03_REWARDS_BOSSES/REWARD_SYSTEM.json`
- Boss：`03_REWARDS_BOSSES/BOSSES_6.json`

## 英文字庫擴充

請務必閱讀：
`01_SPECS/VOCABULARY_EXPANSION_SPEC.md`

Core 300 是第一包，不是上限。架構至少支援 2,000 字，後續新增 300～500 字不用修改核心程式。

## UI

功能與資料：
以 SPEC / JSON 為準。

視覺：
以 `04_UI_REFERENCES/` 圖片作為 art direction 與 layout 參考。

## 角色

首版必須支援：
- 男主角
- 女主角

兩者共享所有遊戲進度與系統規則。

## Codex desktop entry point

When using Codex, open the project root and use **`AGENTS.md` as the first instruction file**. Do not make Codex reread the full development prompt on every task. Use `06_GUIDES/CODEX_EXECUTION_PROMPTS.md` for the sequential implementation prompts.

## Human execution manual

For step-by-step Codex execution, model/reasoning recommendations, Codex self-checks, and manual acceptance tests, use:

- `06_GUIDES/Real_Life_Quest_Codex_Execution_Playbook_v1.1.docx`
- `06_GUIDES/CODEX_EXECUTION_PROMPTS.md`

## Art Bible

`01_SPECS/ART_BIBLE.md` 是最高美術規範；UI 模擬圖負責 layout/composition，美術角色與世界一致性以 ART BIBLE 為準。
