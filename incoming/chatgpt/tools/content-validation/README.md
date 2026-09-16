# A2｜Content Validator

標準 Python 3 即可執行，不需要額外 pip 套件。

## 在 Real Life Quest repo 根目錄執行

```bash
python incoming/chatgpt/tools/content-validation/validate_content.py \
  --project-root . \
  --fixtures-root incoming/chatgpt/data/vocabulary-fixtures \
  --report-dir incoming/chatgpt/reports/data-qa
```

## 檢查範圍

- Core 300：數量、唯一 ID / word、必填欄位、180 spelling targets、複習週期、語音設定。
- 30 篇故事：數量、唯一 ID、4 題、現實任務、思維卡、`charCount`（以去除空白後字數比對）。
- 任務：120 + 30 + 30、跨檔 ID 唯一、必要欄位、運動/家事安全與 offscreen/parent-confirmation 規則。
- 6 Boss：數量、ID、HP/step 對應、EXP 10–15。
- Reward：Lv1–10 threshold 與 cosmetic 無數值 bonus。
- A1 fixtures：合法包必須接受；故意錯誤包必須以指定 error code 拒絕。

## Exit code

- `0`：正式資料 PASS，且 A1 fixture 預期結果全部吻合。
- `1`：正式資料或 fixture expectation 有 ERROR。
- `2`：保留作工具/fixture 使用錯誤。

> 注意：這個工具做的是 **content/static contract QA**。它不能取代 Codex Stage 4 的 IndexedDB、pack enable/disable、WordProgress preservation 與 300→600→800 runtime 整合測試。
