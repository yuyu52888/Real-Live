# Stage 6 Review Fix Prompt

Read `AGENTS.md` first.
Work only on branch `stage6-rewards`.
Do not merge `main`.

The Stage 6 implementation is substantially correct and its existing tests already pass. Do NOT rewrite Stage 6, canonical JSON, IndexedDB schema, Stage 3–5 behavior, or add Boss behavior.

Apply only the following review fixes.

## 1. Complete the generic Stage 7 reward boundary

The Stage 6 specification requires generic, idempotent fragment/chest/inventory grant APIs that Stage 7 can call without writing directly to the `rewards` store. `grantChestFragments()` exists, but direct generic chest/inventory grants are still missing.

Add focused exported service APIs in `js/services/reward-service.js` (names may vary if equivalent), for example:

- `grantInventoryReward(db, { sourceType, sourceId, category, itemId, name, quantity = 1, now })`
- `grantChest(db, system, { sourceType, sourceId, chestType, outcome, poolType, rng, now })`

Requirements:

### Generic inventory grant
- use the existing `rewards` store;
- stable source/grant marker so the same source cannot pay twice after repeat/reload/concurrent calls;
- stable inventory IDs (`inventory:<category>:<itemId>`);
- permanent categories such as `title`, `badge`, and `cosmetic` remain quantity 1 / claim-once ownership;
- additive inventory such as canonical tickets may increase quantity exactly once per distinct grant source;
- granting an already-owned story badge/cosmetic from a later Boss path must be a no-op for ownership rather than create a duplicate;
- localized name is a display snapshot, never the primary key;
- do not invent Boss IDs, Boss conditions, or Boss reward policy.

### Generic direct chest grant
- use the existing `rewards` store and existing `openChest()` semantics;
- stable source/grant marker so the same direct chest source cannot create multiple chests;
- persist the chest outcome at grant/creation time so reload never rerolls it;
- allow Stage 7 to specify a non-Boss-specific `chestType` and a caller-supplied frozen stable outcome;
- optionally allow canonical `normal` / `boss` pool selection through `selectChestOutcome`, but do NOT decide that a `chapter` chest uses any particular pool in Stage 6;
- the created record must be compatible with current `openChest()` (`type: "chest"`, stable id, chestType, source, outcome, unopened/opened state);
- no `bossProgress` reads/writes.

Do not refactor `grantChestFragments()` unless a very small reuse is safe. Preserve its currently passing behavior.

Add focused persistence tests proving:
1. same generic inventory grant source called twice increments only once;
2. a permanent badge/cosmetic already owned remains single ownership;
3. same direct chest grant source called twice creates/returns one stable chest;
4. direct chest outcome survives reload unchanged;
5. current `openChest()` opens that direct chest idempotently;
6. no Boss state is changed.

## 2. Do not resynchronize the whole reward system on every quest timer/progress tick

Current `performQuest()` always calls `refreshRewardState()`. This means an exercise timer/counter can trigger a full reward scan + player normalization every second even though progress updates cannot change rewards.

Narrow the synchronization boundary to the Stage 6 contract:
- quest start: refresh quest state only;
- counter/timer progress update: refresh quest state only;
- quest completion/finalization: refresh quest state + reward state;
- parent approval/finalization: refresh quest state + reward state.

A simple option flag on `performQuest()` is acceptable, e.g. `syncRewards: false` by default, with `completeQuest` / `approveCompletion` opting in.

Do not change Stage 3 quest completion semantics or timer behavior.

Add a narrow static/unit regression proving progress/timer operations do not request reward synchronization while completion/approval still do, or otherwise structure the code so this boundary is unambiguous and testable.

## 3. Preserve cumulative EXP display at Lv10+ and valid progressbar ARIA

Stage 6 keeps lifetime cumulative EXP even above the final Lv10 threshold (450). The shared Home `expBar()` currently clamps the displayed caption to the target, so 451 EXP can be shown as 450 / 450 even though persisted cumulative EXP is 451.

Fix display semantics:
- visual bar may clamp to 100%;
- `aria-valuenow` must not exceed `aria-valuemax`;
- visible cumulative EXP text must preserve the real current value, e.g. `EXP 451 / 450` at Lv10;
- Hero progressbar should also clamp `aria-valuenow` while retaining the true cumulative text.

Add targeted render tests for a Lv10 player with EXP > 450.

## Verification

Run only the narrow fixes first, then:
- `npm run test:stage6`
- `npm test`
- `npm run validate:content`
- `npm run check`
- existing persistence/browser regression as required by the changed files
- `git diff --check`

Preserve all current passing Stage 0–5 behavior.
Do not implement Stage 7 Boss logic.
Do not merge main.

Commit and push to `origin/stage6-rewards`.

Reply only with:
- files changed
- fixes implemented
- targeted tests/results
- regression results
- commit SHA
- push PASS/FAIL
- remaining limitations