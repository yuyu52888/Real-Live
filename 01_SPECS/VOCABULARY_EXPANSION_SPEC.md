# Real Life Quest｜Vocabulary Extensibility Specification v1.0

## 1. 強制需求

英文系統不得把「300 個單字」寫死在 UI、程式常數、進度條、等級條件或資料表結構中。

目前 Core 300 只是第一個 vocabulary pack。系統必須能在不修改核心英文模組程式碼的情況下：

- 增加 300～500 個單字；
- 增加更多 vocabulary pack；
- 未來總量至少支援 2,000 個單字；
- 保留既有 Core 300 的學習進度；
- 新增單字後不重置任何 `WordProgress`；
- 統計數字由目前已載入字庫動態計算；
- 可由家長模式匯入合法 JSON 字庫；
- 可停用某個 pack，但不得刪除孩子既有歷史紀錄。

## 2. 資料模型

### VocabularyPack

```json
{
  "schemaVersion": 1,
  "packId": "core300-zhTW",
  "packVersion": "1.0.0",
  "title": "Core 300",
  "locale": "zh-TW",
  "sourceType": "builtin",
  "description": "國小核心英文第一階段",
  "order": 10,
  "enabledByDefault": true,
  "words": []
}
```

### VocabularyWord

每個單字必須擁有**全域穩定 ID**，不可使用 array index 當 key。

```json
{
  "wordId": "core300-zhTW:W001",
  "legacyId": "W001",
  "packId": "core300-zhTW",
  "word": "apple",
  "meaningZh": "蘋果",
  "partOfSpeech": "noun",
  "category": "food_drink",
  "level": "A",
  "difficulty": 1,
  "example": "I eat an apple after lunch.",
  "exampleZh": "我在午餐後吃一顆蘋果。",
  "spellingRequired": true,
  "imageAsset": null,
  "imageCueZh": "兒童友善蘋果插圖",
  "audioFile": null,
  "audioLocale": "en-US",
  "tags": ["daily-life","food"],
  "reviewScheduleDays": [1,3,7,14,30]
}
```

### WordProgress

學習進度與字庫本體必須分離。

```json
{
  "wordId": "core300-zhTW:W001",
  "state": "practiced",
  "correctCount": 9,
  "wrongCount": 2,
  "streak": 3,
  "lastSeenAt": "2026-09-15T08:00:00+08:00",
  "lastReviewAt": "2026-09-15T08:02:00+08:00",
  "nextReviewAt": "2026-09-22T08:02:00+08:00",
  "spellingUnlocked": true
}
```

## 3. Pack 載入方式

正式專案請建立：

```text
/data/vocabulary/
  index.json
  core300.json
  expansion_daily_300.json
  expansion_school_200.json
```

`index.json` 範例：

```json
{
  "schemaVersion": 1,
  "packs": [
    {
      "packId": "core300-zhTW",
      "file": "core300.json",
      "enabled": true,
      "order": 10
    }
  ]
}
```

英文模組啟動時：

1. 讀取 `index.json`；
2. 載入所有 enabled packs；
3. 驗證 schema；
4. 用 `wordId` 去重；
5. 將內容寫入 / 更新 IndexedDB `vocabularyWords`；
6. 不覆寫 `wordProgress`；
7. 重新計算總字數、分類、等級與可複習數量。

## 4. 家長匯入字庫

家長模式提供：

**設定 → 英文字庫 → 匯入字庫 JSON**

匯入前必須檢查：

- schemaVersion；
- packId 唯一性；
- wordId 唯一性；
- `word` 不可空白；
- `meaningZh` 不可空白；
- `example` / `exampleZh` 可選，但若有則需成對；
- rate / review fields 不可破壞全域語音設定；
- 重複 `wordId` 必須提供「更新 / 跳過」策略；
- 匯入失敗不得破壞現有資料。

家長可查看：

- 已安裝 pack；
- 單字數；
- 啟用 / 停用；
- 版本；
- 匯入日期。

## 5. UI 不得寫死數量

禁止：

```js
const TOTAL_WORDS = 300;
```

改為：

```js
const totalWords = await vocabularyRepository.countEnabledWords();
```

畫面文字應顯示：

- `已掌握 82 / 300`（目前只有 Core 300 時）
- 加入 400 字擴充包後，自動變成 `已掌握 82 / 700`

但「Core 300 完成度」仍必須能單獨查看：

- Core 300：82 / 300
- Daily Expansion：0 / 300
- School Expansion：0 / 100

## 6. 學習排程

排程以 `wordId` 為單位，不以 pack 為單位。

新增 pack 後：
- 不一次把所有新字塞入今日任務；
- 每日新字數仍遵守 3～5 字；
- 優先處理到期複習，再加入新字；
- 家長可指定目前使用哪些 pack；
- 新 pack 可設定解鎖條件，例如 Core 300 掌握 70% 後才開始出現。

## 7. 語音

所有 pack 共用全域語速設定：

- 預設：0.75x
- 最低：0.60x
- 最高：1.10x
- step：0.05x

優先順序：

1. 若 `audioFile` 有檔案，播放該檔案；
2. 否則使用 Web Speech API `SpeechSynthesis`；
3. 單字與例句皆必須支援語速；
4. 新增 vocabulary pack 不需額外修改發音程式。

## 8. IndexedDB

建議 stores：

```text
vocabularyPacks
vocabularyWords
wordProgress
wordSessions
```

Key：
- `vocabularyPacks`: `packId`
- `vocabularyWords`: `wordId`
- `wordProgress`: `wordId`
- `wordSessions`: auto increment / UUID

建議 index：
- `packId`
- `category`
- `level`
- `nextReviewAt`
- `state`

## 9. Migration

資料庫需有 `dbVersion`。

任何未來 schema 更新：
- 使用 migration；
- 不清空 IndexedDB；
- 不以「重新初始化」處理版本升級；
- migration 前可自動建立 JSON backup。

## 10. 驗收條件

必須通過：

1. Core 300 正常載入。
2. 學習 10 個字後保留進度。
3. 匯入額外 300 字 pack。
4. 總量由 300 自動變成 600。
5. 原 10 個字進度完全保留。
6. 新字可被排入今日學習。
7. 可再匯入第二個 200 字 pack。
8. 總量變成 800。
9. 停用一個 pack 後，該 pack 不再出新任務，但歷史仍存在。
10. 重新啟用後進度恢復。
11. 300 / 600 / 800 字情境下，不需改任何 UI 程式碼。
