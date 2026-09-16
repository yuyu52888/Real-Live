# A1｜Vocabulary Expansion Fixtures

這個資料夾是 **Stage 4 英文引擎的測試資料**，不是正式教學字庫。

## 合法測試包

- `mock_expansion_300.json`：300 字；Core 300 匯入後應成為 600。
- `mock_expansion_200.json`：200 字；再匯入後應成為 800。
- `valid_minimal_pack_2.json`：最小合法 pack，用來確認 optional fields 沒有被錯誤寫成 required。

## 故意錯誤的 Pack

依 `fixture_manifest.json` 所列 `expectedErrorCode` 驗證。這些檔案 **必須被拒絕**，而且拒絕時不得破壞已存在的 Core 300 或 WordProgress。

## 重要

1. 測試詞為 synthetic fixture，不得呈現在正式兒童學習內容中。
2. Stage 4 必須實際跑 `300 -> 600 -> 800`，不能只做 schema 靜態檢查。
3. `WordProgress` 必須以穩定 `wordId` 獨立保存，不能因新 pack 匯入、停用、重啟而重置。
4. 系統不得存在 `TOTAL_WORDS = 300` 或等價硬編碼。
