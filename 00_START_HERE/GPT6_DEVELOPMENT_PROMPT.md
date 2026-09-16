# GPT-6 DEVELOPMENT PROMPT
## Real Life Quest｜兒童現實 RPG 學習系統
### Target: HTML / CSS / JavaScript PWA for tablet

---

# ROLE

你是本專案的 Lead Product Engineer、UI Engineer、Game Systems Engineer 與 QA Engineer。

你的任務不是製作概念 Demo，而是依本交接包建立一套**可實際在平板使用、可持久保存資料、可離線運作、可持續擴充內容**的 Real Life Quest MVP。

請先閱讀整個 package，再施工。

不得只做靜態畫面。
不得用假按鈕代替核心功能。
不得把資料硬寫死在 HTML。
不得以重新整理頁面就遺失資料的方式實作。

---

# 1. PRODUCT GOAL

Real Life Quest 是給約 8 歲兒童使用的「現實生活 RPG」。

目的不是讓孩子長時間使用平板，而是：

1. 讓孩子主動選擇任務；
2. 降低開始學習與生活任務的心理阻力；
3. 把現實中的努力轉化成可見的 EXP、Lv、徽章、稱號、Boss 進度；
4. 培養專注、學習、耐心、生活、合作能力；
5. 把英文、思維閱讀留在短時間 App 學習；
6. 把運動、家事、數學、生活挑戰帶回現實世界；
7. 讓家長負責設定、審核與查看週報；
8. 長期逐步降低對外在獎勵的依賴。

核心語句：

> 「把真實生活，變成大冒險。」

---

# 2. AUTHORITATIVE INPUT FILES

請按照以下優先順序解讀需求。

## Level 1 — Functional truth

- `01_SPECS/UI_UX_IMPLEMENTATION_SPEC.md`
- `01_SPECS/VOCABULARY_EXPANSION_SPEC.md`
- `02_DATA/*.json`
- `03_REWARDS_BOSSES/*.json`

若資料與圖片衝突，以這些規格 / JSON 為準。

## Level 2 — Interaction flow

- `01_SPECS/UI_UX_FLOW_SPEC.md`

## Level 3 — Visual reference

`04_UI_REFERENCES/*.png`

這些圖片是**視覺與版面參考**，不是像素級必須完全複製的最終資產。

請保留：
- 奇幻冒險 RPG 氛圍；
- 天空藍 / 草地綠 / 金黃 / 暖橘；
- 木牌標題；
- 米白任務卡；
- 大型圖示與大按鈕；
- 角色＋寵物；
- Boss 區塊；
- 兒童容易理解的資訊層級。

若圖片裡的數值或文案與 JSON 不一致，以 JSON 為準。

---

# 3. NON-NEGOTIABLE TECH STACK

建立：

- HTML5
- CSS3
- Vanilla JavaScript ES Modules
- PWA
- IndexedDB
- Service Worker
- Web App Manifest
- Web Speech API / SpeechSynthesis
- 無後端也能完整使用 MVP

除非有非常充分理由，**不要導入 React / Vue / Angular**。

本專案第一版要：
- 無 build step 也可執行；
- 容易交接；
- 平板可以直接安裝；
- Offline-first。

可使用輕量的本地第三方 library，但必須：
1. 可離線；
2. 不依賴雲端 CDN；
3. 被放進 `/vendor/`；
4. README 說明用途。

---

# 4. TARGET DEVICES

第一優先：
- iPad / Android tablet portrait

同時支援：
- tablet landscape
- desktop
- modern mobile browser

Touch-first。

不得將 hover 當作必要互動。

Minimum touch target:
- 44 × 44 px
- 主要 CTA 建議 56 px 以上

---

# 5. REQUIRED PROJECT STRUCTURE

可微調，但核心模組必須分離：

```text
/
  index.html
  manifest.webmanifest
  service-worker.js
  README.md

  /css/
    tokens.css
    base.css
    layout.css
    components.css
    animations.css
    responsive.css

  /js/
    app.js
    router.js

    /core/
      db.js
      migrations.js
      settings.js
      backup.js
      event-bus.js

    /repositories/
      player-repository.js
      task-repository.js
      vocabulary-repository.js
      story-repository.js
      reward-repository.js
      boss-repository.js

    /services/
      quest-service.js
      exp-service.js
      achievement-service.js
      reward-service.js
      vocabulary-service.js
      review-scheduler.js
      speech-service.js
      boss-service.js
      weekly-report-service.js
      parent-approval-service.js

    /ui/
      components.js
      modal.js
      toast.js
      celebration.js

    /pages/
      onboarding.js
      home.js
      quests.js
      quest-detail.js
      learn.js
      vocabulary.js
      story-reader.js
      boss.js
      hero.js
      rewards.js
      parent.js
      settings.js

  /data/
    tasks/
    stories/
    bosses/
    rewards/
    vocabulary/
      index.json
      core300.json

  /assets/
    /characters/
      /boy/
      /girl/
    /pets/
    /tasks/
    /badges/
    /backgrounds/
    /icons/

  /tests/
```

---

# 6. ONBOARDING

First launch：

## Step 1
歡迎頁：
- Logo
- 「把真實生活，變成大冒險」
- 開始冒險

## Step 2
角色選擇：

### 男主角
### 女主角

兩位角色：
- 不同外觀；
- 完全相同能力；
- 完全相同任務；
- 完全相同獎勵經濟。

不得將性別綁定任何能力或任務。

## Step 3
輸入暱稱。

## Step 4
家長設定：
- PIN
- 每日任務量
- 家長審核開關
- 運動任務啟用
- 家事任務啟用
- 發音預設語速

完成後進入首頁。

---

# 7. CHARACTER SYSTEM

角色資料至少：

```js
{
  id,
  nickname,
  avatarVariant: "boy" | "girl",
  level,
  totalExp,
  titleId,
  streak,
  abilities,
  equipment,
  petId,
  backgroundId
}
```

男 / 女主角共享同一資料。

角色切換：
- 只改 `avatarVariant`
- 不重置 Lv
- 不重置 EXP
- 不重置任務歷史
- 不重置英文進度
- 不重置故事
- 不重置獎勵

角色 pose asset slots：

- idle
- happy
- celebrate
- thinking
- reading
- studying
- exercise
- chore
- tired
- surprise
- walking
- portrait

若正式素材尚未提供：
- 使用乾淨 placeholder / SVG；
- 保留相同 asset path；
- 不讓缺圖阻塞功能開發。

---

# 8. HOME DASHBOARD

依 `01_home_dashboard.png` 的資訊層級實作。

必須顯示：

- 主角
- 寵物
- Lv
- EXP progress
- 稱號
- Streak
- 寶箱碎片
- 今日任務入口
- 英文學習入口
- 思維故事入口
- 今日 Boss
- 今日任務完成進度
- 鼓勵句

底部固定 navigation：

- 首頁
- 任務
- 學習
- 角色
- 家長

---

# 9. QUEST SYSTEM

資料來源：

- `reality_tasks_120.json`
- `exercise_task_cards_30.json`
- `chore_task_cards_30.json`

分類：

- reading
- english
- exercise
- chores
- life
- focus
- cooperation
- creativity
- exploration
- persistence
- self-management
- hidden

任務卡必須從 data repository 動態 render。

不要將某個任務寫死在 HTML。

每張卡：
- title
- category icon
- description
- difficulty
- EXP
- completion criteria
- parent confirmation
- start button

---

# 10. EXERCISE QUESTS

使用 `exercise_task_cards_30.json`。

任務詳情：

- 大插圖 / icon
- 任務名稱
- 難度
- EXP
- 完成目標
- 三個動作要領
- 安全提示
- manual counter 或 timer
- 完成任務

例如：
跳繩 100 下：

```text
目前 60 / 100
[-] [60] [+]
```

注意：
- 計數是幫助記錄，不是自動運動辨識；
- 不要求 camera / pose AI；
- 不要做醫療或健身診斷。

完成後進入 parent approval（若該任務需要）。

---

# 11. CHORE QUESTS

使用 `chore_task_cards_30.json`。

必須顯示：
- 大插圖 / icon
- 任務名稱
- EXP
- 難度
- 操作步驟
- 安全提醒
- optional photo record
- 完成任務
- 家長確認

照片：
- MVP 可以存本機 Blob / IndexedDB；
- 為 optional；
- 不上傳雲端。

---

# 12. THINKING STORIES

使用：
- `thinking_stories_30.json`

故事為正式內容，不要由 App 即時生成。

每篇：
- 500～700 字級別
- title
- theme
- body
- 4 questions
- realityTask
- takeaway

Reader：
- 大字體
- 行距舒適
- 避免一屏太多內容
- 可顯示約閱讀時間
- scroll progress optional

完成故事後：
1. 想一想
2. 今日現實任務
3. 思維卡
4. 完成閱讀
5. EXP / chapter progress

不要考：
- 主角名字；
- 不重要的細節記憶。

目標是理解與應用。

---

# 13. ENGLISH MODULE

英文必須是一個**可擴充內容引擎**，不是 Core 300 特製頁面。

必讀：
`01_SPECS/VOCABULARY_EXPANSION_SPEC.md`

目前：
- Core 300

未來：
- 再加入 300～500 字
- 之後仍可持續增加

第一版至少要驗證 800 words 不改 code 仍能正常使用。

## Modes

- 今日新單字
- 今日複習
- 中文找英文
- 英文找圖片
- 聽音找字
- 記憶翻牌
- 拼字挑戰

## Daily recommendation

- 新字 3～5
- 複習 3～5
- 到期複習優先

## Progress

不得使用：

```js
TOTAL_WORDS = 300
```

任何總數都從 repository 計算。

Core 300 本身可保留獨立進度。

---

# 14. SPEECH

使用：
- Web Speech API / SpeechSynthesis
- `en-US`

語速：

- default: 0.75x
- min: 0.60x
- max: 1.10x
- step: 0.05x

快速選項：
- 0.60
- 0.75
- 0.90
- 1.00
- 1.10

必須適用：
- 單字
- 例句
- listening quiz

設定要 persist。

若 word 有 `audioFile`：
- audioFile 優先；
- 沒有才使用 SpeechSynthesis。

---

# 15. REVIEW SCHEDULER

基礎 interval：
- 1
- 3
- 7
- 14
- 30 days

要求：
- 以 `wordId` 計算；
- progress 與 vocabulary content 分離；
- 答錯可提前回到今天稍後或隔天；
- 不刪除歷史；
- 新增 pack 不影響既有排程。

Mastery states：

```text
unseen
seen
known
practiced
mastered
```

---

# 16. MATH

App 不建立數學題庫。

數學題由家長在現實世界提供。

App 只記：
- start
- duration
- count
- wrong count optional
- retry
- completion
- EXP
- parent approval

任務開始後顯示簡化 timer，鼓勵孩子離開平板。

---

# 17. EXP / LEVEL

以 `REWARD_SYSTEM.json` 為準。

原則：

- 失敗不扣 EXP；
- 未完成不倒扣；
- 不得讓孩子因一次失敗失去已取得等級；
- 防止 repeated button click 刷 EXP；
- 一個 quest completion event 只能發獎一次。

所有 EXP transaction 建議記錄：

```js
{
  transactionId,
  sourceType,
  sourceId,
  amount,
  createdAt
}
```

確保可追蹤且 idempotent。

---

# 18. REWARDS

實作：

- level rewards
- treasure fragments
- chests
- badges
- titles
- tickets
- cosmetics
- privilege rewards

Cosmetic only：
- 不增加攻擊力；
- 不增加學科能力；
- 不形成 pay-to-win。

物質獎勵：
- 預設 disabled；
- 由家長啟用；
- 不應作為日常任務的主要 reward。

---

# 19. BOSS SYSTEM

使用：
- `BOSSES_6.json`

每五篇思維故事一個 chapter。

Boss：
- HP
- story
- progress steps
- challenge
- rewards

完成 step 後：
- 持久保存；
- reload 不消失。

Boss defeat：
- animation
- badge
- chest
- cosmetic
- chapter progress

---

# 20. PARENT MODE

PIN protected。

功能：

## Pending approvals
- quest
- child completion time
- optional photo
- approve
- return

注意：
退回不是懲罰。
不扣既有 EXP。

## Settings
- daily task count
- enabled categories
- approval rules
- speech min/max
- rest day
- material reward toggle
- vocabulary packs

## Vocabulary Pack Manager
必須做到：
- installed pack list
- word count
- enable / disable
- import JSON
- import validation
- keep progress

## Weekly report
至少：
- completed tasks
- English learning / reviews
- thinking stories
- exercise count
- chore count
- focus time
- retries
- strongest ability this week

---

# 21. OFFLINE + PERSISTENCE

IndexedDB 是 source of truth。

LocalStorage 僅可存：
- small UI preference
- last route
- non-critical flags

所有重要資料：
- IndexedDB

包括：
- player
- tasks
- history
- word progress
- story progress
- reward inventory
- achievements
- boss progress
- approvals
- settings

Service Worker：
- app shell cache
- local data files cache
- offline launch

---

# 22. BACKUP / RESTORE

家長模式：

## Export
輸出一個 JSON：

```text
real-life-quest-backup-YYYY-MM-DD.json
```

需含：
- schemaVersion
- exportedAt
- player
- settings
- histories
- vocabulary packs metadata
- word progress
- rewards
- achievements
- bosses

## Import
- validate version
- preview
- confirm
- migrate
- restore

Import 失敗：
- 不可破壞現有資料。

---

# 23. DATABASE MIGRATIONS

必須實作 schema version。

禁止：
「版本變更 → 刪 DB → 重建」。

Migration：
- preserves user data
- testable
- backup before destructive migration

---

# 24. VISUAL IMPLEMENTATION

UI 參考圖中可以看到：
- RPG 木牌
- 角色插畫
- 藍天 / 城堡背景
- 白色 / 米白卡片
- 黃色主要 CTA
- 藍色次要 CTA
- 星星難度
- 大型任務插畫

不要只是做一般 admin dashboard。

要讓 8 歲孩子覺得：
「這是我的冒險遊戲。」

但不能：
- 過度動畫；
- 滿畫面閃爍；
- 影響閱讀；
- 讓 App 本身成為主要遊戲。

---

# 25. ACCESSIBILITY

至少：
- button 有 aria-label
- 不只靠顏色區分狀態
- focus visible
- text contrast 合理
- font scaling 不破版
- reduced-motion support
- audio button 有文字 / icon label

---

# 26. SAFETY UX

運動：
- 明確安全提示
- 有不舒服即停止
- 不鼓勵超量刷 EXP

家事：
- 刀具
- 熱源
- 高處
- 化學清潔劑
- 重物

不得設成孩子單獨完成的預設任務。

照片：
- local only MVP
- 不自動分享

---

# 27. ANTI-GAMING / EXPLOIT

避免：
- 重複按完成刷 EXP；
- reload 再領 reward；
- 開多 tab 重複領；
- 單純播放音檔刷 EXP；
- 手動計數 + 按完成直接重複獲獎。

使用 unique completion ID / transaction ID。

---

# 28. PERFORMANCE

平板：
- first meaningful UI 儘量快；
- 資料 JSON lazy load；
- 圖片使用合理尺寸；
- large art lazy load；
- 不在首次啟動載入全部 30 篇故事插圖或全部 vocabulary 圖片。

---

# 29. FIRST IMPLEMENTATION PHASES

不要一次寫一個巨大檔案。

## Phase 1 — Shell
- router
- nav
- CSS tokens
- responsive layout
- onboarding
- male/female avatar selection

## Phase 2 — Persistence
- IndexedDB
- migrations
- player/settings
- backup

## Phase 3 — Quest engine
- quest loading
- quest list
- details
- completion
- parent approval
- EXP

## Phase 4 — English
- pack loader
- Core 300
- speech
- review scheduler
- game modes
- extensibility

## Phase 5 — Story
- 30 stories
- questions
- reality quest
- chapter progress

## Phase 6 — Rewards
- level
- badges
- titles
- chest
- tickets
- cosmetics

## Phase 7 — Boss
- 6 bosses
- HP/progress
- rewards

## Phase 8 — Parent
- approvals
- weekly report
- vocabulary pack manager

## Phase 9 — PWA
- manifest
- service worker
- install/offline

## Phase 10 — QA
- migration
- refresh
- offline
- 300→600→800 vocabulary extension test
- tablet layout

---

# 30. REQUIRED AUTOMATED / MANUAL TESTS

建立最少 smoke tests / self-test page。

## Core persistence
- create player
- reload
- still exists

## Quest
- complete quest
- reward once
- reload
- cannot double reward

## Parent approval
- child finishes
- pending approval
- parent approves
- reward issued once

## English
- Core 300 loaded
- speech changes speed
- progress survives reload
- review date works

## Vocabulary extension — REQUIRED
1. Core 300 loaded.
2. Learn at least 10 words.
3. Import mock 300-word pack.
4. Total becomes 600.
5. Existing progress unchanged.
6. New pack can generate learning tasks.
7. Import another mock 200-word pack.
8. Total becomes 800.
9. Disable one pack.
10. Existing history remains.
11. Re-enable and continue.
12. No source code changes needed.

## Backup
- export
- reset test DB
- restore
- state matches

## Offline
- load once online/local server
- disable network
- app still opens and core functions work

---

# 31. DEFINITION OF DONE

MVP 不算完成，除非：

- [ ] 男 / 女角色都可選
- [ ] 選角不影響遊戲能力
- [ ] 資料 reload 不遺失
- [ ] 每日任務可完成
- [ ] 運動 / 家事任務可顯示要領
- [ ] 家長審核可用
- [ ] Core 300 可用
- [ ] 發音速度可調
- [ ] 30 篇故事可讀
- [ ] EXP / Lv 正常
- [ ] 徽章 / 稱號 / 寶箱可取得
- [ ] Boss 可完成
- [ ] PWA 可安裝
- [ ] Offline 可開
- [ ] JSON backup / restore 可用
- [ ] Vocabulary 300→600→800 測試通過
- [ ] 沒有任何 `TOTAL_WORDS = 300` 類的硬編碼
- [ ] UI 主要版面符合參考圖方向
- [ ] README 有啟動與測試方式

---

# 32. DO NOT DO

不要：
- 把所有 JS 寫在一個檔案；
- 用 array index 當 persistent ID；
- 用 localStorage 存全部 app state；
- 寫死 300 字；
- 寫死 30 篇故事數量；
- 寫死某個任務；
- 失敗扣 EXP；
- 讓孩子用金錢購買能力；
- 加排行榜；
- 加廣告；
- 加社群；
- 加需要網路的核心依賴；
- 自行改掉目前 reward economy；
- 自行把數學題放進 App；
- 自行將照片上傳外部服務。

---

# 33. EXPECTED DELIVERY

請交付：

1. 完整專案資料夾；
2. 可直接啟動的 `index.html`；
3. `README.md`；
4. `CHANGELOG.md`；
5. `/tests/` 或 self-test；
6. sample vocabulary expansion pack：
   - `mock_expansion_300.json`
   - `mock_expansion_200.json`
7. `DATA_SCHEMA.md`；
8. `KNOWN_LIMITATIONS.md`；
9. 若有 placeholder asset，列在 `ASSET_TODO.md`；
10. 最後執行一次完整 smoke test 並修正明顯錯誤。

完成後，請回報：
- 完成項目；
- 未完成項目；
- 測試結果；
- 如何啟動；
- 如何匯入新英文字庫；
- 哪些視覺資產仍需正式替換。

---

# FINAL PRODUCT PRINCIPLE

Real Life Quest 的核心不是：

> 「做功課換獎品。」

而是：

> 「讓孩子看得見自己的成長，並把現實中的小挑戰變成願意開始的冒險。」

技術、UI、獎勵、英文、Boss 都必須服務這個原則。
