# A4｜UI_COPY_ZH_TW

`UI_COPY_ZH_TW.json` 是建議的繁中 UI 文案來源。

## 整合原則
- Codex 先比對目前 Stage 1/後續 UI；不要為了接文案重寫既有 routing / component。
- 優先把可重用、非內容資料型的固定 UI 文案改由 key 取得。
- 任務名稱、故事標題、Boss 名稱、單字等 canonical content 仍來自正式 JSON，不複製到 UI copy。
- `{token}` 是 runtime interpolation，不可直接顯示空字串。
- 鼓勵句刻意避免「你很聰明」或同儕競爭，重點是開始、策略、重試與進步。
