# Stage 8 Parent Mode — Implementation Audit

Status: **READY FOR IMPLEMENTATION**

Baseline: `main@c4fa58648030ec60e59291a13c8a0cd25a36fb43` after Stage 7.

Stage 8 owns the PIN-protected parent workspace, return-for-adjustment flow, weekly report, parent settings, avatar switching, and vocabulary-pack management. It must not implement Stage 9 backup/restore UI or PWA/offline changes.

## Existing foundations

- Parent PIN credential already persists in `settings` and is verified by `parent-auth.js`.
- Pending approvals already exist and approval is EXP-idempotent.
- `settings` already stores onboarding preferences.
- Vocabulary pack install/update/enable/disable and validation already exist from Stage 4.
- Reward material choices already check `preferences.materialRewardsEnabled === true`.
- Player/avatar, quest history, word sessions/progress, story progress, approvals, rewards, and Boss progress already persist.
- `DB_VERSION = 2`; no new store is needed for Stage 8.

Therefore Stage 8 must **not bump DB_VERSION**.

## Stage 8 functional scope

### 1. Parent access boundary

Keep PIN protection. Parent unlock is memory-only.

When the user leaves the Parent route, relock Parent mode so returning to Parent requires the PIN again. Do not persist an unlocked flag.

Do not add a sixth navigation item.

### 2. Approval return flow

Add a real "退回調整" action for pending approvals.

Rules:
- only a pending approval may be returned;
- returning never creates EXP and never subtracts EXP;
- quest history becomes `returned`;
- preserve current quest progress;
- child may adjust and resubmit;
- resubmission reuses the same stable approval row instead of creating duplicates;
- approval returns to `pending` on resubmission;
- preserve an append-only `returnEvents: [ISO timestamp...]` array on the approval record;
- duplicate return/resubmit actions must not double-count or corrupt state;
- approved/completed quests cannot be returned.

Quest UI must recognize `returned`, show the existing Traditional-Chinese returned copy, allow applicable counter/timer adjustment, and offer a re-submit completion action.

### 3. Parent approval policy

Canonical `task.requiresParentConfirmation=true` is mandatory and can never be disabled by parent settings.

The existing `parentApprovalRequired` preference means:
- when true, **all quests** require parent approval;
- when false, only canonical tasks with `requiresParentConfirmation=true` require approval.

The app layer should pass this effective policy into completion logic. Direct service calls without that optional policy must keep Stage 3 canonical behavior for regression compatibility.

Quest UI should indicate the **effective** approval requirement, not only the canonical flag.

### 4. Parent settings

Persist additive settings fields in the existing settings record. Old settings/backups without new fields must load using defaults.

Required defaults:
- `dailyTaskGoal: 2`
- `exerciseEnabled: true`
- `choresEnabled: true`
- `parentApprovalRequired: true`
- `maxTaskDifficulty: 5`
- `restDays: []`
- `speechRate: 0.75`
- `speechMinRate: 0.60`
- `speechMaxRate: 1.10`
- `materialRewardsEnabled: false`

Validation:
- dailyTaskGoal: 1..3
- maxTaskDifficulty: 1..5
- restDays: unique integers 0..6
- speech bounds: 0.60..1.10 in 0.05 increments and min <= max
- current speechRate must be clamped into a newly tightened parent range
- booleans remain booleans

No canonical task JSON is modified.

### 5. Difficulty setting behavior

`maxTaskDifficulty` is a display/selection filter over canonical difficulty stars.

- star count is derived from the canonical difficulty string;
- tasks above the parent's max difficulty are omitted from Quest lists and Home daily task suggestions;
- progress/history for hidden tasks is preserved;
- changing the setting never deletes or rewrites task history.

### 6. Rest-day behavior

Rest days are device-local weekdays (0=Sunday ... 6=Saturday).

On a configured rest day:
- Home should clearly show that today is a rest day;
- daily task target pressure is suppressed;
- quests remain accessible voluntarily;
- existing history/progress is untouched.

Stage 8 does not invent a streak engine. The product rule "rest day does not break streak" remains available for the later streak implementation.

### 7. Speech parent lock

`02_DATA/speech_settings.json` remains the hard global boundary 0.60..1.10 / step 0.05.

Parent settings add a narrower allowed range:
- child quick-rate controls must only offer rates inside the parent range;
- programmatic changes outside the parent range are rejected or normalized safely;
- current rate is clamped when parent narrows the range;
- word/example/listening speech still share one persisted rate.

Do not modify canonical speech JSON.

### 8. Material rewards

Expose the existing material-reward gate in Parent settings.

- default OFF;
- ON only when parent explicitly enables it;
- turning it OFF again must not delete already-owned rewards;
- ordinary quest rewards are unchanged.

### 9. Avatar switch

Parent may switch boy/girl avatar.

- update only the player's avatar variant;
- keep Lv, EXP, active title, quests, vocabulary, stories, rewards, Boss progress, and all histories;
- refresh Home/Hero immediately;
- no progress reset.

### 10. Vocabulary Pack Manager

Use existing Stage 4 repository/services.

Parent can:
- view installed packs;
- see pack title/version/enabled state/word count;
- enable/disable a pack;
- import a local JSON pack;
- explicitly choose update-existing-pack when packId conflicts;
- cancel/skip instead of updating;
- see validation/conflict errors without data damage.

Requirements:
- never delete `wordProgress` when a pack is disabled or updated;
- total enabled word count updates dynamically;
- Core 300 remains a normal pack, not a hardcoded ceiling;
- cross-pack duplicate `wordId` remains rejected atomically;
- after pack changes, refresh the English dashboard.

Do not implement cloud download or remote pack catalogs.

### 11. Weekly report

Current week = device-local Monday 00:00 through next Monday 00:00.

Derive from existing source-of-truth stores; do not persist a second statistics database.

Report:
- completed quests;
- English learning sessions and total answered cards from `wordSessions`;
- completed thinking stories;
- exercise count;
- chore count;
- retry count;
- strongest ability.

Retry definition for Stage 8:
- count Parent "退回調整" events from approval `returnEvents`;
- do not invent self-retry events that were never persisted.

Strongest ability:
- map completed quest IDs back to canonical task `ability` / `abilityExp`;
- sum abilityExp for the current week;
- support ties;
- show "尚無資料" when no qualifying quest exists.

English limitation:
- current Stage 4 sessions do not persist an exact new-vs-review classification per answer;
- report "英文學習回合 / 練習題數", not a fabricated exact review count.

Focus-time limitation:
- current quest history does not contain a reliable generic focus-duration field;
- render the focus-time metric as "尚未記錄" (or null with explanatory UI) unless an explicit structured focus-duration field exists;
- do **not** infer minutes by parsing task prose or by subtracting startedAt/completedAt.

This limitation is preferable to reporting false data.

### 12. Parent page UI

After PIN unlock, show three primary tabs:
- 待審核
- 本週報告
- 設定

Settings can contain sections:
- child/avatar;
- task controls;
- rest days;
- English speech bounds;
- material rewards;
- vocabulary packs.

Use touch targets >=44px and keep the existing tablet-first visual language.

### 13. Explicit Stage 8 exclusions

Do not implement in this stage:
- backup export/import UI (Stage 9);
- Service Worker/PWA/offline changes (Stage 9);
- cloud sync/account/login;
- analytics/telemetry;
- task-photo persistence (current backup contract is JSON-only; do not silently add Blob state);
- a new streak engine;
- arbitrary category enable/disable beyond existing exercise/chore controls;
- canonical JSON rewrites.

## Acceptance coverage

At minimum verify:
1. PIN still gates Parent.
2. leaving Parent relocks it.
3. pending approval can be returned without EXP.
4. returned quest can adjust and resubmit.
5. one approval stable ID survives multiple return/resubmit cycles.
6. `returnEvents` counts retries.
7. approval still grants EXP exactly once.
8. global approval ON makes a canonical non-approval quest require approval.
9. global approval OFF cannot bypass canonical exercise/chore approval.
10. settings survive reload.
11. max difficulty filters UI without deleting history.
12. rest day suppresses target pressure but keeps quests available.
13. speech parent min/max constrains child controls and persists.
14. material rewards default OFF and explicit toggle persists.
15. avatar switch preserves progress.
16. pack list/count loads.
17. pack disable/re-enable preserves word progress.
18. valid import works; conflict update is explicit; invalid import is atomic.
19. 300→600→800 Stage 4 regression still passes.
20. weekly task/story/exercise/chore/session metrics are date-bounded.
21. retry metric comes only from structured return events.
22. strongest ability derives from canonical abilityExp.
23. focus time is not fabricated when unavailable.
24. five bottom-nav items remain.
25. DB_VERSION remains 2.
26. Stage 3–7 regressions pass.

## Gate conclusion

Stage 8 is **READY**. The highest-risk changes are approval return/resubmission idempotency, activating the previously-unused global approval preference without bypassing canonical safety, and keeping vocabulary progress intact through Parent pack operations.
