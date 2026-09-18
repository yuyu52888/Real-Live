# Stage 8 Codex Brief — Parent Mode

Work only on branch `stage8-parent`.
Read `AGENTS.md` first.

Do **not** reread the whole repository. The full policy is already frozen in:
`06_GUIDES/STAGE8_IMPLEMENTATION_AUDIT.md`

Read that audit only if a listed rule below is ambiguous.

## Implement only these Stage 8 items

1. Expand Parent page into three tabs:
   - 待審核
   - 本週報告
   - 設定

2. Add approval return/resubmit:
   - return pending quest -> history status `returned`
   - zero EXP change
   - preserve progress
   - append ISO timestamp to approval `returnEvents`
   - resubmit reuses the same approval ID and returns it to pending
   - approved/completed quests cannot be returned
   - Quest UI renders returned state and permits adjustment/resubmit

3. Activate effective approval policy:
   - effective = canonical `requiresParentConfirmation` OR parent `parentApprovalRequired`
   - canonical true can never be bypassed
   - keep direct Stage 3 service behavior backward-compatible when optional global policy is not passed

4. Parent settings in existing `settings` store; no DB migration:
   - dailyTaskGoal 1..3
   - exerciseEnabled
   - choresEnabled
   - parentApprovalRequired
   - maxTaskDifficulty 1..5
   - restDays unique weekdays 0..6
   - speechMinRate / speechMaxRate within 0.60..1.10 step .05
   - materialRewardsEnabled, default false
   - preserve current speechRate, clamp only when new bounds require it

5. Apply settings:
   - max difficulty filters Quest/Home suggestions only; never deletes history
   - rest day shows a Home rest-day state and removes daily-target pressure, but quests remain usable
   - child speech controls stay inside parent range
   - material rewards use the existing Stage 6 gate

6. Parent avatar switch:
   - boy/girl only
   - preserve all player progress and histories

7. Vocabulary Pack Manager using existing Stage 4 APIs:
   - list installed packs + word count/version/enabled
   - enable/disable
   - local JSON import
   - explicit update-existing option for packId conflict
   - invalid/collision import remains atomic
   - never delete `wordProgress`
   - refresh English dashboard after changes

8. Weekly report, Monday-local week:
   - completed quests
   - English learning session count + answered-card count
   - stories
   - exercise
   - chores
   - retries = approval `returnEvents`
   - strongest ability = completed quest canonical `abilityExp` totals
   - focus time: show unavailable/not-recorded unless structured duration exists; never parse prose or infer from wall-clock timestamps

9. Parent security:
   - Parent unlock is memory-only
   - navigating away from Parent relocks it

## Do not do

- no DB_VERSION/schema change
- no canonical JSON edits
- no backup/restore UI
- no Service Worker/PWA changes
- no cloud/login/telemetry
- no photo persistence
- no new streak engine
- no sixth navigation item
- no unrelated refactor

## Suggested focused modules

Prefer small additions such as:
- `js/services/weekly-report.js`
- focused Parent settings/dashboard helper if needed
- extend `quest-service.js` for return/resubmit
- expand existing Parent page rather than creating parallel Parent routes

Use existing vocabulary, speech, player, settings, reward, quest repositories/services.

## Verification

Run narrow Stage 8 tests first, then:
- `npm run validate:assets`
- `npm run validate:content`
- `npm run check`
- `npm test`
- existing Stage 3/A7 persistence
- Stage 4 300→600→800 regression
- Stage 5
- Stage 6
- Stage 7
- 768×1024 browser/persistence smoke
- `git diff --check`

Add `test:stage8` if useful.

Commit and push to `origin/stage8-parent`.
Do not merge main.

Final response only:
- Files changed
- Implemented
- Stage 8 tests/results
- Regression results
- Browser/persistence result
- Commit SHA
- Push result
- Remaining limitation
