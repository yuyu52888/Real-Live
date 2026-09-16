import { openDatabase, putRecord } from "../js/core/database.js";
import { getPlayer, savePlayer } from "../js/repositories/player.js";
import { getRewardRecord, listRewardRecords } from "../js/repositories/rewards.js";
import { saveSettings } from "../js/repositories/settings.js";
import { claimLevelReward, grantChestFragments, normalizePlayerLevel, openChest, selectActiveTitle, synchronizeRewards } from "../js/services/reward-service.js";
import { loadRewardSystem } from "../js/services/reward-system.js";

export async function testStage6Persistence() {
  const name = `real-life-quest-stage6-${Date.now()}-${Math.random()}`;
  let db = await openDatabase({ name });
  const system = await loadRewardSystem("/03_REWARDS_BOSSES/REWARD_SYSTEM.json");
  await savePlayer(db, { nickname: "測試者", avatarVariant: "boy", onboardingStep: "complete", progress: { level: 1, title: "新手冒險家", exp: { current: 65, target: 100 }, stats: { courage: 7 } } });
  await saveSettings(db, { preferences: { materialRewardsEnabled: false } });

  let progress = await normalizePlayerLevel(db, system);
  assertEqual(progress.exp.current, 65, "normalization preserves cumulative EXP");
  assertEqual(progress.level, 3, "normalized level");
  assertEqual(progress.exp.target, 105, "normalized next target");
  assertEqual(progress.stats.courage, 7, "unrelated player stats preserved");

  const firstClaim = await claimLevelReward(db, system, 2, "frame_bronze");
  const duplicateClaim = await claimLevelReward(db, system, 2, "frame_bronze");
  const alternateClaim = await claimLevelReward(db, system, 2, "choose_family_movie");
  assertEqual(firstClaim.optionId, "frame_bronze", "cosmetic claim");
  assertEqual(duplicateClaim.optionId, "frame_bronze", "duplicate returns first claim");
  assertEqual(alternateClaim.optionId, "frame_bronze", "alternate blocked by first claim");
  assertEqual((await getRewardRecord(db, "inventory:cosmetic:frame_bronze")).quantity, 1, "cosmetic not duplicated");
  assertEqual((await getPlayer(db)).progress.stats.courage, 7, "cosmetic has no stat side effect");

  const playerRecord = await getPlayer(db);
  await savePlayer(db, { ...playerRecord, progress: { ...playerRecord.progress, exp: { ...playerRecord.progress.exp, current: 450 } } });
  await normalizePlayerLevel(db, system);
  for (const [level, optionId] of [[3, "bonus_exp_2"], [4, "boss_retry"], [5, "quest_skip"], [6, "double_exp"], [8, "rest_card"], [9, "reroll_3"]]) await claimLevelReward(db, system, level, optionId);
  const ticketExpected = { bonus2: 1, boss_retry: 1, skip: 1, double: 1, rest: 1, reroll: 3 };
  for (const [ticketId, quantity] of Object.entries(ticketExpected)) assertEqual((await getRewardRecord(db, `inventory:ticket:${ticketId}`)).quantity, quantity, `ticket ${ticketId}`);
  await assertRejects(() => claimLevelReward(db, system, 7, "mystery_unlock"), "mystery ticket deferred");
  assertEqual(await getRewardRecord(db, "inventory:ticket:mystery_unlock"), undefined, "no fake mystery ticket");
  await assertRejects(() => claimLevelReward(db, system, 10, "small_gift"), "material disabled by default");
  await claimLevelReward(db, system, 10, "major_family_choice");

  for (let index = 0; index < 10; index += 1) await putRecord(db, "questHistory", { id: `reward-q-${index}`, status: "completed", canonicalCategory: "english" });
  for (let index = 0; index < 50; index += 1) await putRecord(db, "wordProgress", { wordId: `reward-w-${index}`, state: "mastered" });
  for (let index = 1; index <= 10; index += 1) await putRecord(db, "storyProgress", { storyId: `S${String(index).padStart(2, "0")}`, completedAt: "2026-09-17T00:00:00.000Z" });
  let dashboard = await synchronizeRewards(db, system);
  const titleIds = dashboard.titles.map(({ itemId }) => itemId);
  const badgeIds = dashboard.badges.map(({ itemId }) => itemId);
  for (const id of ["first_quest", "task_10", "english_10", "english_50", "reading_10"]) assertIncludes(titleIds, id, `title ${id}`);
  for (const id of ["badge_first", "badge_story_ch1", "badge_story_ch2"]) assertIncludes(badgeIds, id, `badge ${id}`);
  for (const id of ["retry_5", "focus_100", "streak_7", "boss_5"]) assertEqual(await getRewardRecord(db, `inventory:title:${id}`), undefined, `deferred title ${id}`);
  await selectActiveTitle(db, "first_quest");
  await assertRejects(() => selectActiveTitle(db, "retry_5"), "locked title selection");

  const bossSentinel = { bossId: "B01", hp: 3 };
  await putRecord(db, "bossProgress", bossSentinel);
  let grant = await grantChestFragments(db, system, { sourceType: "test", sourceId: "four", amount: 4, rng: () => 0 });
  assertEqual(grant.balance, 4, "4 fragments remainder");
  assertEqual(grant.chestIds.length, 0, "4 fragments no chest");
  const duplicateGrant = await grantChestFragments(db, system, { sourceType: "test", sourceId: "four", amount: 4, rng: () => 0 });
  assertEqual(JSON.stringify(duplicateGrant), JSON.stringify(grant), "fragment source idempotency");
  grant = await grantChestFragments(db, system, { sourceType: "test", sourceId: "one", amount: 1, rng: () => 0 });
  assertEqual(grant.chestIds.length, 1, "5 total creates one chest");
  grant = await grantChestFragments(db, system, { sourceType: "test", sourceId: "seven", amount: 7, rng: () => 0 });
  assertEqual(grant.chestIds.length, 1, "7 creates one chest");
  assertEqual(grant.balance, 2, "7 leaves two");
  grant = await grantChestFragments(db, system, { sourceType: "test", sourceId: "eight", amount: 8, rng: () => 0 });
  assertEqual(grant.chestIds.length, 2, "2+8 creates two chests");
  assertEqual(grant.balance, 0, "10 leaves zero");

  const rolls = [0.81, 0];
  const bonusGrant = await grantChestFragments(db, system, { sourceType: "test", sourceId: "bonus", amount: 5, rng: () => rolls.shift() ?? 0 });
  const bonusChestId = bonusGrant.chestIds[0];
  const frozenOutcome = (await getRewardRecord(db, bonusChestId)).outcome;
  db.close();
  db = await openDatabase({ name });
  assertEqual(JSON.stringify((await getRewardRecord(db, bonusChestId)).outcome), JSON.stringify(frozenOutcome), "chest outcome survives reload");
  const expBefore = (await getPlayer(db)).progress.exp.current;
  const opened = await openChest(db, system, bonusChestId);
  const openedAgain = await openChest(db, system, bonusChestId);
  assertEqual(openedAgain.openedAt, opened.openedAt, "open chest idempotency");
  assertEqual((await getPlayer(db)).progress.exp.current, expBefore + 2, "bonus EXP paid once");
  assertEqual((await getRewardTransaction(db, `chest-exp:${bonusChestId}`)).amount, 2, "bonus EXP transaction");
  assertEqual((await getPlayer(db)).progress.level, 10, "bonus EXP level safe");
  assertEqual((await getPlayer(db)).progress.exp.target, 450, "Lv10 target capped");
  assertEqual(JSON.stringify(await readStore(db, "bossProgress", "B01")), JSON.stringify(bossSentinel), "Boss state unchanged");

  db.close();
  db = await openDatabase({ name });
  progress = (await getPlayer(db)).progress;
  assertEqual(progress.activeTitleId, "first_quest", "active title reload");
  assertEqual(progress.title, "初學冒險者", "active title display reload");
  dashboard = await synchronizeRewards(db, system);
  assertEqual(dashboard.chests.filter(({ id }) => id === bonusChestId).length, 0, "opened chest remains opened");
  assertEqual((await listRewardRecords(db)).filter(({ id }) => id === "level-claim:2").length, 1, "claim remains single record");
  db.close();
  return "Stage 6 persistence PASS: normalization, claims, aliases, backfill, titles, fragments, frozen chests, idempotent EXP.";
}

function getRewardTransaction(db, id) { return readStore(db, "transactions", id); }
function readStore(db, store, id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function assertRejects(operation, label) {
  let rejected = false;
  try { await operation(); } catch { rejected = true; }
  if (!rejected) throw new Error(`${label}: expected rejection`);
}
function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`); }
function assertIncludes(values, expected, label) { if (!values.includes(expected)) throw new Error(`${label}: missing ${expected}`); }
