# Real Life Quest｜A1 + A2 Handoff v1.0

## A1 — Vocabulary fixtures

位置：`incoming/chatgpt/data/vocabulary-fixtures/`

目的：提供 Stage 4 必須使用的 300→600→800 擴充測試資料，以及匯入失敗時的防破壞測試。

## A2 — Content Validator

位置：`incoming/chatgpt/tools/content-validation/`

目的：在 Codex 進入資料驅動功能前，快速檢查目前 canonical JSON 與 A1 fixtures 的 static contract。

## 安裝方式

把本 ZIP **直接解壓到 Real Life Quest repo 根目錄**。只會新增 `/incoming/chatgpt/` 與本 handoff / integration prompt，不應覆蓋 `/js`、`/css`、IndexedDB 或 service files。

## 驗證指令

```bash
python incoming/chatgpt/tools/content-validation/validate_content.py --project-root . --fixtures-root incoming/chatgpt/data/vocabulary-fixtures --report-dir incoming/chatgpt/reports/data-qa
```

預期：exit code `0`、報告 `PASS`。

## Stage dependency

- A1：Stage 4 英文引擎**完整驗收前必須存在**。
- A2：建議 Stage 3 前接入；不是 Stage 1/2 的阻塞條件。
