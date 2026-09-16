# A5｜Asset Manifest Candidate

`ASSET_MANIFEST.json` 是候選整合版，不應直接覆蓋正式 `assets/ASSET_MANIFEST.json`。

## 內容
- 目前 37 個角色/狐狸 PNG：`ready`，保留實際尺寸、透明背景與 SHA256。
- 30 運動 + 30 家事插圖：`pending`，已鎖定 logical ID 與 canonical path。
- 6 Boss、7 背景、30 Story cover、Reward badges/cosmetics：`pending`。
- 通用 UI icon 預設用 inline SVG/CSS，不要求先製作 bitmap。

## 核心規則
正式美術缺件不阻塞 Stage 1–9。程式以 logical ID / fallback 顯示；Stage 10 前再補齊主要正式圖。
