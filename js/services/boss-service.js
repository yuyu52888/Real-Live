import { runTransaction } from "../core/database.js";
import { PLAYER_ID } from "../repositories/player.js";
import { getBossById } from "../repositories/bosses.js";
import { listBossProgress } from "../repositories/boss-progress.js";
import { listRewardRecords } from "../repositories/rewards.js";
import { listStoryProgress } from "../repositories/story-progress.js";
import { grantChest, grantChestFragments, grantInventoryReward } from "./reward-service.js";
import { chapterNumberForStory } from "./story-chapters.js";
import { deriveLevel } from "./reward-system.js";

export const BOSS_FRAGMENT_REWARD = 5;
const STORY_IDS = Object.freeze(Array.from({ length: 30 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`));


export function storyIdsForBoss(boss) {
  return STORY_IDS.filter((storyId) => chapterNumberForStory(storyId) === boss.chapter);
}

export function bossUnlockProgress(boss, storyProgress) {
  const completed = new Set(storyProgress.filter(({ completedAt }) => completedAt).map(({ storyId }) => storyId));
  const storyIds = storyIdsForBoss(boss);
  const count = storyIds.filter((id) => completed.has(id)).length;
  return { completed: count, total: storyIds.length, unlocked: count === storyIds.length };
}

export function buildBossDashboard(bosses, storyProgress, progressRecords, rewardRecords = []) {
  const progressByBoss = new Map(progressRecords.map((record) => [record.bossId, record]));
  const chapterChestByBoss = new Map(rewardRecords
    .filter(({ type, sourceType }) => type === "chest" && sourceType === "boss-chapter")
    .map((record) => [record.sourceId, record]));
  const items = [...bosses].sort((a, b) => a.chapter - b.chapter).map((boss) => {
    const progressRecord = normalizeProgress(progressByBoss.get(boss.id), boss.id);
    const unlock = bossUnlockProgress(boss, storyProgress);
    return {
      ...boss,
      steps: boss.progress,
      unlock,
      progressRecord,
      defeated: Boolean(progressRecord.defeatedAt),
      rewardsGranted: Boolean(progressRecord.rewardsGrantedAt),
      remainingHp: Math.max(0, boss.hp - progressRecord.completedSteps.length),
      chapterChest: chapterChestByBoss.get(boss.id) ?? null,
    };
  });
  const homeBoss = selectHomeBoss(items);
  const allDefeated = items.length > 0 && items.every(({ defeated }) => defeated);
  return { bosses: items, homeBoss: homeBoss ? { ...homeBoss, allDefeated } : null, allDefeated };
}

export function selectHomeBoss(bosses) {
  return bosses.find(({ unlock, defeated }) => unlock.unlocked && !defeated)
    ?? bosses.find(({ defeated }) => !defeated)
    ?? bosses[0]
    ?? null;
}

export async function loadBossDashboard(db, bosses) {
  const [storyProgress, bossProgress, rewardRecords] = await Promise.all([
    listStoryProgress(db), listBossProgress(db), listRewardRecords(db),
  ]);
  return buildBossDashboard(bosses, storyProgress, bossProgress, rewardRecords);
}

export async function synchronizeBosses(db, bosses, rewardSystem, options = {}) {
  const progressRecords = await listBossProgress(db);
  for (const progress of progressRecords.filter(({ defeatedAt, rewardsGrantedAt }) => defeatedAt && !rewardsGrantedAt)) {
    const boss = getBossById(bosses, progress.bossId);
    if (boss) await grantBossVictory(db, boss, rewardSystem, options);
  }
  return loadBossDashboard(db, bosses);
}

export async function completeBossStep(db, bosses, rewardSystem, bossId, step, options = {}) {
  const boss = getBossById(bosses, bossId);
  if (!boss) throw new Error("找不到這個 Boss。");
  const requestedStep = Number(step);
  if (!Number.isInteger(requestedStep) || !boss.progress.some((entry) => entry.step === requestedStep)) throw new Error("Boss 進度步驟無效。");
  const now = asDate(options.now);
  const transition = await runTransaction(db, ["storyProgress", "bossProgress"], "readwrite", (tx) => {
    const storiesRequest = tx.objectStore("storyProgress").getAll();
    const progressStore = tx.objectStore("bossProgress");
    let result;
    storiesRequest.onsuccess = () => {
      const unlock = bossUnlockProgress(boss, storiesRequest.result ?? []);
      if (!unlock.unlocked) { result = { error: "完成本章 5 篇故事後，才能挑戰 Boss。" }; return; }
      const progressRequest = progressStore.get(boss.id);
      progressRequest.onsuccess = () => {
        const existing = normalizeProgress(progressRequest.result, boss.id);
        if (existing.completedSteps.includes(requestedStep)) { result = { progress: existing, duplicate: true }; return; }
        const expectedStep = boss.progress.find(({ step: candidate }) => !existing.completedSteps.includes(candidate))?.step;
        if (requestedStep !== expectedStep) { result = { error: "請依序完成 Boss 挑戰步驟。" }; return; }
        const completedSteps = [...existing.completedSteps, requestedStep].sort((a, b) => a - b);
        const defeated = completedSteps.length === boss.hp;
        const saved = {
          ...existing,
          completedSteps,
          startedAt: existing.startedAt ?? now.toISOString(),
          updatedAt: now.toISOString(),
          defeatedAt: defeated ? existing.defeatedAt ?? now.toISOString() : existing.defeatedAt,
        };
        progressStore.put(saved);
        result = { progress: saved, duplicate: false };
      };
    };
    return () => result;
  });
  if (transition?.error) throw new Error(transition.error);
  if (transition?.progress?.defeatedAt) await grantBossVictory(db, boss, rewardSystem, options);
  return { ...transition, dashboard: await loadBossDashboard(db, bosses) };
}

export async function grantBossVictory(db, boss, rewardSystem, options = {}) {
  const now = asDate(options.now);
  const rng = options.rng ?? Math.random;
  const afterGrant = options.afterGrant ?? (() => {});
  const badgeId = `badge_story_ch${boss.chapter}`;
  const cosmeticId = `boss_${boss.id.toLowerCase()}`;
  const badge = rewardSystem.badges.find(({ id }) => id === badgeId);
  await grantBossExp(db, boss, rewardSystem, now);
  await afterGrant("exp");
  await grantInventoryReward(db, { sourceType: "boss-badge", sourceId: boss.id, category: "badge", itemId: badgeId, name: badge?.name ?? boss.rewards.badge, now });
  await afterGrant("badge");
  await grantInventoryReward(db, { sourceType: "boss-cosmetic", sourceId: boss.id, category: "cosmetic", itemId: cosmeticId, name: boss.rewards.cosmetic, now });
  await afterGrant("cosmetic");
  await grantChestFragments(db, rewardSystem, { sourceType: "boss-win", sourceId: boss.id, amount: BOSS_FRAGMENT_REWARD, rng, now });
  await afterGrant("fragments");
  await grantChest(db, rewardSystem, { sourceType: "boss-chapter", sourceId: boss.id, chestType: "chapter", poolType: "boss", rng, now });
  await afterGrant("chapter-chest");
  await grantBossAchievements(db, rewardSystem, now);
  await afterGrant("achievements");
  await markRewardsGranted(db, boss.id, now);
}

function grantBossExp(db, boss, rewardSystem, now) {
  const transactionId = `boss-exp:${boss.id}`;
  return runTransaction(db, ["transactions", "player"], "readwrite", (tx) => {
    const transactions = tx.objectStore("transactions");
    const players = tx.objectStore("player");
    const transactionRequest = transactions.get(transactionId);
    let result;
    transactionRequest.onsuccess = () => {
      if (transactionRequest.result) { result = transactionRequest.result; return; }
      const playerRequest = players.get(PLAYER_ID);
      playerRequest.onsuccess = () => {
        const player = playerRequest.result;
        if (!player?.progress?.exp) return;
        const current = player.progress.exp.current + Number(boss.rewards.exp);
        const derived = deriveLevel(current, rewardSystem.levelThresholds);
        result = { id: transactionId, sourceType: "boss", sourceId: boss.id, type: "exp", amount: Number(boss.rewards.exp), createdAt: now.toISOString() };
        transactions.add(result);
        players.put({ ...player, progress: { ...player.progress, level: derived.level, exp: { ...player.progress.exp, current, target: derived.target } } });
      };
    };
    return () => result;
  }).then((result) => {
    if (!result) throw new Error("找不到玩家資料，Boss 獎勵尚未完成。");
    return result;
  });
}

async function grantBossAchievements(db, rewardSystem, now) {
  const defeated = (await listBossProgress(db)).filter(({ defeatedAt }) => defeatedAt).length;
  if (defeated >= 1) {
    const badge = rewardSystem.badges.find(({ id }) => id === "badge_first_boss");
    if (badge) await grantInventoryReward(db, { sourceType: "boss-achievement-first", sourceId: "badge_first_boss", category: "badge", itemId: badge.id, name: badge.name, now });
  }
  if (defeated >= 5) {
    const title = rewardSystem.titles.find(({ id }) => id === "boss_5");
    if (title) await grantInventoryReward(db, { sourceType: "boss-achievement", sourceId: "boss_5", category: "title", itemId: title.id, name: title.name, now });
  }
}

function markRewardsGranted(db, bossId, now) {
  return runTransaction(db, ["bossProgress"], "readwrite", (tx) => {
    const store = tx.objectStore("bossProgress");
    const request = store.get(bossId);
    request.onsuccess = () => {
      const progress = request.result;
      if (progress && !progress.rewardsGrantedAt) store.put({ ...progress, rewardsGrantedAt: now.toISOString(), updatedAt: now.toISOString() });
    };
  });
}

function normalizeProgress(progress, bossId) {
  return {
    bossId,
    completedSteps: Array.isArray(progress?.completedSteps) ? [...new Set(progress.completedSteps)].sort((a, b) => a - b) : [],
    startedAt: progress?.startedAt ?? null,
    updatedAt: progress?.updatedAt ?? null,
    defeatedAt: progress?.defeatedAt ?? null,
    rewardsGrantedAt: progress?.rewardsGrantedAt ?? null,
  };
}

function asDate(value) {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}
