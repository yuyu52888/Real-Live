import { openDatabase, putRecord } from "../js/core/database.js";
import { getBossProgress } from "../js/repositories/boss-progress.js";
import { getPlayer, savePlayer } from "../js/repositories/player.js";
import { getRewardRecord, listRewardRecords } from "../js/repositories/rewards.js";
import { loadBosses } from "../js/repositories/bosses.js";
import { completeBossStep, synchronizeBosses } from "../js/services/boss-service.js";
import { openChest } from "../js/services/reward-service.js";
import { loadRewardSystem } from "../js/services/reward-system.js";

export async function testStage7Persistence() {
  const name = `real-life-quest-stage7-${Date.now()}-${Math.random()}`;
  let db = await openDatabase({ name });
  const [bosses, system] = await Promise.all([
    loadBosses("/03_REWARDS_BOSSES/BOSSES_6.json"),
    loadRewardSystem("/03_REWARDS_BOSSES/REWARD_SYSTEM.json"),
  ]);
  await savePlayer(db, { nickname: "Boss測試者", avatarVariant: "boy", onboardingStep: "complete", progress: { level: 1, title: "新手冒險家", exp: { current: 25, target: 30 } } });

  await assertRejects(() => completeBossStep(db, bosses, system, "B01", 1), "locked Boss");
  assertEqual((await getPlayer(db)).progress.exp.current, 25, "locked attempt never subtracts EXP");
  for (let index = 1; index <= 5; index += 1) await putRecord(db, "storyProgress", { storyId: `S0${index}`, completedAt: "2026-09-17T00:00:00.000Z" });
  await assertRejects(() => completeBossStep(db, bosses, system, "B01", 2), "future step");
  assertEqual((await getPlayer(db)).progress.exp.current, 25, "out-of-order attempt never changes EXP");

  const first = await completeBossStep(db, bosses, system, "B01", 1, { now: new Date("2026-09-17T01:00:00.000Z") });
  const duplicate = await completeBossStep(db, bosses, system, "B01", 1, { now: new Date("2026-09-17T02:00:00.000Z") });
  assertEqual(first.progress.startedAt, "2026-09-17T01:00:00.000Z", "first step starts encounter");
  assertEqual(duplicate.duplicate, true, "completed step duplicate no-op");
  assertEqual(duplicate.progress.updatedAt, first.progress.updatedAt, "duplicate does not rewrite timestamp");
  await completeBossStep(db, bosses, system, "B01", 2);

  let injectedFailure = false;
  await assertRejects(() => completeBossStep(db, bosses, system, "B01", 3, {
    rng: () => 0,
    afterGrant(component) { if (component === "badge" && !injectedFailure) { injectedFailure = true; throw new Error("simulated interruption"); } },
  }), "partial payout interruption");
  let progress = await getBossProgress(db, "B01");
  assertTruthy(progress.defeatedAt, "defeat persisted before payout");
  assertEqual(progress.rewardsGrantedAt, null, "partial payout not marked complete");
  assertEqual((await getPlayer(db)).progress.exp.current, 35, "partial payout EXP paid once");

  db.close();
  db = await openDatabase({ name });
  let dashboard = await synchronizeBosses(db, bosses, system, { rng: () => 0, now: new Date("2026-09-17T03:00:00.000Z") });
  progress = await getBossProgress(db, "B01");
  assertTruthy(progress.rewardsGrantedAt, "startup recovery completes payout");
  const recoveredPlayer = await getPlayer(db);
  assertEqual(recoveredPlayer.progress.exp.current, 35, "recovery does not pay EXP twice");
  assertEqual(recoveredPlayer.progress.level, 2, "Boss EXP recalculates level");
  assertEqual(recoveredPlayer.progress.exp.target, 65, "Boss EXP recalculates next threshold");
  assertEqual(dashboard.bosses[0].remainingHp, 0, "defeat survives reload");
  assertEqual((await getRewardRecord(db, "inventory:badge:badge_story_ch1")).quantity, 1, "chapter badge once");
  assertEqual((await getRewardRecord(db, "inventory:cosmetic:boss_b01")).quantity, 1, "Boss cosmetic once");
  assertEqual((await getRewardRecord(db, "inventory:badge:badge_first_boss")).quantity, 1, "first Boss achievement once");
  assertTruthy(await getRewardRecord(db, "chest:normal:1"), "five fragments create normal chest");
  const chapterChest = await getRewardRecord(db, "chest:direct:chapter:boss-chapter:B01");
  assertEqual(chapterChest.chestType, "chapter", "explicit chapter chest created");
  assertEqual(chapterChest.status, "unopened", "chapter chest remains visible until opened");
  const firstDefeatedAt = progress.defeatedAt;
  const frozenChapterOutcome = JSON.stringify(chapterChest.outcome);
  const rewardRecords = await listRewardRecords(db);
  assertEqual(rewardRecords.filter(({ id, amount }) => id === "fragment-grant:boss-win:B01" && Number(amount) === 5).length, 1, "five-fragment source recorded once");
  assertEqual(rewardRecords.filter(({ type, sourceId }) => type === "chest" && sourceId === "fragments:boss-win:B01").length, 1, "normal fragment chest exactly once");
  assertEqual(rewardRecords.filter(({ type, sourceType, sourceId }) => type === "chest" && sourceType === "boss-chapter" && sourceId === "B01").length, 1, "chapter chest exactly once");
  assertEqual((await readStore(db, "transactions", "boss-exp:B01")).amount, 10, "stable Boss EXP transaction");
  db.close();
  db = await openDatabase({ name });
  assertEqual(JSON.stringify((await getRewardRecord(db, chapterChest.id)).outcome), frozenChapterOutcome, "chapter outcome survives reload without reroll");

  const beforeDuplicate = JSON.stringify(await listRewardRecords(db));
  await Promise.all([
    completeBossStep(db, bosses, system, "B01", 3, { rng: () => 0 }),
    completeBossStep(db, bosses, system, "B01", 3, { rng: () => 0 }),
  ]);
  assertEqual((await getPlayer(db)).progress.exp.current, 35, "concurrent final-step retry pays once");
  assertEqual((await getBossProgress(db, "B01")).defeatedAt, firstDefeatedAt, "duplicate finalize preserves defeatedAt");
  assertEqual(JSON.stringify(await listRewardRecords(db)), beforeDuplicate, "duplicate victory creates no rewards");
  const opened = await openChest(db, system, chapterChest.id);
  const openedAgain = await openChest(db, system, chapterChest.id);
  assertEqual(openedAgain.openedAt, opened.openedAt, "chapter chest opens idempotently");

  for (const bossId of ["B02", "B03", "B04"]) await putRecord(db, "bossProgress", { bossId, completedSteps: [], defeatedAt: "2026-09-17T00:00:00.000Z", rewardsGrantedAt: "2026-09-17T00:00:00.000Z" });
  for (let index = 21; index <= 25; index += 1) await putRecord(db, "storyProgress", { storyId: `S${index}`, completedAt: "2026-09-17T00:00:00.000Z" });
  for (let step = 1; step <= 4; step += 1) await completeBossStep(db, bosses, system, "B05", step, { rng: () => 0 });
  assertEqual((await getRewardRecord(db, "inventory:title:boss_5")).name, "Boss Slayer", "five distinct Bosses unlock title once");

  const bossFiveMarker = await getRewardRecord(db, "inventory-grant:boss-achievement:boss_5");
  for (let index = 26; index <= 30; index += 1) await putRecord(db, "storyProgress", { storyId: `S${index}`, completedAt: "2026-09-17T00:00:00.000Z" });
  for (let step = 1; step <= 3; step += 1) await completeBossStep(db, bosses, system, "B06", step, { rng: () => 0 });
  assertEqual((await getRewardRecord(db, "inventory:title:boss_5")).quantity, 1, "sixth Boss does not duplicate boss_5 inventory");
  assertEqual((await getRewardRecord(db, "inventory-grant:boss-achievement:boss_5")).grantedAt, bossFiveMarker.grantedAt, "sixth Boss does not duplicate boss_5 grant");
  assertEqual((await readStoreAll(db, "approvals")).length, 0, "Boss flow never infers parent approval");
  assertEqual((await readStoreAll(db, "transactions")).filter(({ id }) => id === "boss-exp:B01").length, 1, "Boss EXP transaction remains unique");

  dashboard = await synchronizeBosses(db, bosses, system, { rng: () => 0 });
  assertEqual(dashboard.bosses.length, 6, "dashboard reloads all six Bosses");
  db.close();
  return "Stage 7 persistence PASS: locks, ordering, reload, concurrent idempotency, recovery, EXP, inventory, both chests, achievements.";
}

async function assertRejects(operation, label) {
  let rejected = false;
  try { await operation(); } catch { rejected = true; }
  if (!rejected) throw new Error(`${label}: expected rejection`);
}
function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`); }
function assertTruthy(value, label) { if (!value) throw new Error(`${label}: expected truthy value`); }
function readStore(db, store, id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function readStoreAll(db, store) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}
