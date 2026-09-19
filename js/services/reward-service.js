import { runTransaction } from "../core/database.js";
import { PLAYER_ID } from "../repositories/player.js";
import { SETTINGS_ID } from "../repositories/settings.js";
import { listRewardRecords } from "../repositories/rewards.js";
import { availableLevelOptions, deriveLevel, normalizeTicketOption, selectChestOutcome } from "./reward-system.js";

const FRAGMENT_BALANCE_ID = "reward-balance:chest-fragments";
const PERMANENT_INVENTORY_CATEGORIES = new Set(["title", "badge", "cosmetic"]);

export async function normalizePlayerLevel(db, system) {
  return runTransaction(db, ["player"], "readwrite", (tx) => {
    const store = tx.objectStore("player");
    const request = store.get(PLAYER_ID);
    let progress;
    request.onsuccess = () => {
      const player = request.result;
      if (!player?.progress?.exp) return;
      const exp = player.progress.exp.current;
      const derived = deriveLevel(exp, system.levelThresholds);
      progress = { ...player.progress, level: derived.level, exp: { ...player.progress.exp, current: exp, target: derived.target } };
      store.put({ ...player, progress });
    };
    return () => progress;
  });
}

export async function synchronizeRewards(db, system) {
  const player = await normalizePlayerLevel(db, system);
  const metrics = await loadRewardMetrics(db);
  await backfillCollections(db, system, metrics);
  const [records, settings] = await Promise.all([listRewardRecords(db), getSettingsRecord(db)]);
  const claims = records.filter(({ type }) => type === "level-claim");
  const claimedLevels = new Set(claims.map(({ level }) => level));
  const materialEnabled = settings?.preferences?.materialRewardsEnabled === true;
  const pendingClaims = system.levelRewards
    .filter(({ level }) => level <= (player?.level ?? 1) && !claimedLevels.has(level))
    .map((reward) => ({ ...reward, options: availableLevelOptions(reward, system, materialEnabled) }));
  return buildDashboard(system, player, records, pendingClaims, materialEnabled);
}

export async function claimLevelReward(db, system, level, optionId, now = new Date()) {
  const reward = system.levelRewards.find((item) => item.level === Number(level));
  const option = reward?.options.find((item) => item.id === optionId);
  if (!reward || !option) return Promise.reject(new Error("找不到這個升級獎勵。"));
  const normalizedTicket = option.type === "ticket" ? normalizeTicketOption(option, system) : null;
  if (option.type === "ticket" && !normalizedTicket) return Promise.reject(new Error("此票券尚未定義，暫時不能領取。"));

  const result = await runTransaction(db, ["player", "settings", "rewards"], "readwrite", (tx) => {
    const players = tx.objectStore("player");
    const settings = tx.objectStore("settings");
    const rewards = tx.objectStore("rewards");
    const playerRequest = players.get(PLAYER_ID);
    let result;
    playerRequest.onsuccess = () => {
      const player = playerRequest.result;
      if (!player || deriveLevel(player.progress?.exp?.current, system.levelThresholds).level < reward.level) return;
      const claimId = `level-claim:${reward.level}`;
      const claimRequest = rewards.get(claimId);
      claimRequest.onsuccess = () => {
        if (claimRequest.result) { result = claimRequest.result; return; }
        const settingsRequest = settings.get(SETTINGS_ID);
        settingsRequest.onsuccess = () => {
          if (option.type === "material_optional" && settingsRequest.result?.preferences?.materialRewardsEnabled !== true) return;
          const inventory = levelOptionInventory(option, normalizedTicket, now);
          const inventoryRequest = rewards.get(inventory.id);
          inventoryRequest.onsuccess = () => {
            const savedInventory = mergeInventory(inventoryRequest.result, inventory);
            rewards.put(savedInventory);
            result = { id: claimId, type: "level-claim", level: reward.level, optionId: option.id, optionType: option.type, name: option.name, inventoryId: inventory.id, claimedAt: now.toISOString() };
            rewards.add(result);
          };
        };
      };
    };
    return () => result;
  });
  if (!result) throw new Error("這個獎勵目前不能領取。");
  return result;
}

export async function selectActiveTitle(db, titleId) {
  const result = await runTransaction(db, ["player", "rewards"], "readwrite", (tx) => {
    const players = tx.objectStore("player");
    const rewards = tx.objectStore("rewards");
    const titleRequest = rewards.get(`inventory:title:${titleId}`);
    let progress;
    titleRequest.onsuccess = () => {
      const title = titleRequest.result;
      if (!title) return;
      const playerRequest = players.get(PLAYER_ID);
      playerRequest.onsuccess = () => {
        const player = playerRequest.result;
        if (!player) return;
        progress = { ...player.progress, activeTitleId: title.itemId, title: title.name };
        players.put({ ...player, progress });
      };
    };
    return () => progress;
  });
  if (!result) throw new Error("尚未解鎖這個稱號。");
  return result;
}

export function fragmentConversion(balance, amount, fragmentsNeeded = 5) {
  const total = Math.max(0, Number(balance) || 0) + Math.max(0, Number(amount) || 0);
  return { chestCount: Math.floor(total / fragmentsNeeded), remainder: total % fragmentsNeeded };
}

export function grantChestFragments(db, system, { sourceType, sourceId, amount, rng = Math.random, now = new Date() }) {
  if (!sourceType || !sourceId || !(Number(amount) > 0)) return Promise.reject(new Error("碎片來源與數量無效。"));
  const markerId = `fragment-grant:${sourceType}:${sourceId}`;
  return runTransaction(db, ["rewards"], "readwrite", (tx) => {
    const store = tx.objectStore("rewards");
    const markerRequest = store.get(markerId);
    let result;
    markerRequest.onsuccess = () => {
      if (markerRequest.result) { result = markerRequest.result.result; return; }
      const balanceRequest = store.get(FRAGMENT_BALANCE_ID);
      balanceRequest.onsuccess = () => {
        const oldBalance = balanceRequest.result ?? { id: FRAGMENT_BALANCE_ID, type: "fragment-balance", quantity: 0, nextChestSerial: 1 };
        const conversion = fragmentConversion(oldBalance.quantity, amount, system.chestSystem.fragmentsNeeded);
        const chestIds = [];
        for (let index = 0; index < conversion.chestCount; index += 1) {
          const serial = oldBalance.nextChestSerial + index;
          const chest = createChestRecord("normal", `fragments:${sourceType}:${sourceId}`, serial, selectChestOutcome(system, "normal", rng), now);
          chestIds.push(chest.id);
          store.add(chest);
        }
        store.put({ ...oldBalance, quantity: conversion.remainder, nextChestSerial: oldBalance.nextChestSerial + conversion.chestCount, updatedAt: now.toISOString() });
        result = { amount: Number(amount), balance: conversion.remainder, chestIds };
        store.add({ id: markerId, type: "fragment-grant", sourceType, sourceId, amount: Number(amount), result, grantedAt: now.toISOString() });
      };
    };
    return () => result;
  });
}

export function grantInventoryReward(db, { sourceType, sourceId, category, itemId, name, quantity = 1, now = new Date() }) {
  const grantQuantity = Number(quantity);
  if (![sourceType, sourceId, category, itemId, name].every((value) => String(value ?? "").trim())) {
    return Promise.reject(new Error("獎勵來源與庫存資料無效。"));
  }
  if (!Number.isInteger(grantQuantity) || grantQuantity <= 0) return Promise.reject(new Error("獎勵數量必須是正整數。"));
  const inventoryId = `inventory:${category}:${itemId}`;
  const markerId = `inventory-grant:${stableSegment(sourceType)}:${stableSegment(sourceId)}`;
  return runTransaction(db, ["rewards"], "readwrite", (tx) => {
    const store = tx.objectStore("rewards");
    const markerRequest = store.get(markerId);
    let result;
    markerRequest.onsuccess = () => {
      if (markerRequest.result) { result = markerRequest.result.result; return; }
      const inventoryRequest = store.get(inventoryId);
      inventoryRequest.onsuccess = () => {
        const incoming = { id: inventoryId, type: "inventory", category, itemId, name, quantity: grantQuantity, unlockedAt: now.toISOString() };
        const savedInventory = mergeInventory(inventoryRequest.result, incoming);
        store.put(savedInventory);
        result = { inventoryId, category, itemId, quantityGranted: savedInventory === inventoryRequest.result ? 0 : grantQuantity };
        store.add({ id: markerId, type: "inventory-grant", sourceType, sourceId, category, itemId, quantity: grantQuantity, result, grantedAt: now.toISOString() });
      };
    };
    return () => result;
  });
}

export async function grantChest(db, system, { sourceType, sourceId, chestType, outcome, poolType, rng = Math.random, now = new Date() }) {
  const suppliedOutcome = outcome ? { ...outcome } : null;
  if (![sourceType, sourceId, chestType].every((value) => String(value ?? "").trim())) throw new Error("寶箱來源與類型無效。");
  if (!suppliedOutcome && !["normal", "boss"].includes(poolType)) throw new Error("請提供固定寶箱內容或明確的獎池類型。");
  if (suppliedOutcome && (!suppliedOutcome.id || !suppliedOutcome.label)) throw new Error("固定寶箱內容缺少穩定 ID 或顯示名稱。");
  const markerId = `chest-grant:${stableSegment(sourceType)}:${stableSegment(sourceId)}`;
  const chestId = `chest:direct:${stableSegment(chestType)}:${stableSegment(sourceType)}:${stableSegment(sourceId)}`;
  const result = await runTransaction(db, ["rewards"], "readwrite", (tx) => {
    const store = tx.objectStore("rewards");
    const markerRequest = store.get(markerId);
    let result;
    markerRequest.onsuccess = () => {
      if (markerRequest.result) {
        const chestRequest = store.get(markerRequest.result.chestId);
        chestRequest.onsuccess = () => { result = chestRequest.result; };
        return;
      }
      const frozenOutcome = suppliedOutcome ?? { ...selectChestOutcome(system, poolType, rng) };
      const chest = {
        id: chestId,
        type: "chest",
        chestType,
        sourceType,
        sourceId,
        outcome: frozenOutcome,
        status: "unopened",
        createdAt: now.toISOString(),
      };
      store.add(chest);
      store.add({ id: markerId, type: "chest-grant", sourceType, sourceId, chestId, grantedAt: now.toISOString() });
      result = chest;
    };
    return () => result;
  });
  if (!result) throw new Error("找不到已建立的寶箱。");
  return result;
}

export async function openChest(db, system, chestId, now = new Date()) {
  const result = await runTransaction(db, ["rewards", "transactions", "player"], "readwrite", (tx) => {
    const rewards = tx.objectStore("rewards");
    const transactions = tx.objectStore("transactions");
    const players = tx.objectStore("player");
    const chestRequest = rewards.get(chestId);
    let result;
    chestRequest.onsuccess = () => {
      const chest = chestRequest.result;
      if (!chest || chest.type !== "chest") return;
      if (chest.status === "opened") { result = chest; return; }
      applyChestOutcome({ rewards, transactions, players }, system, chest, now, (inventoryId) => {
        result = { ...chest, status: "opened", openedAt: now.toISOString(), inventoryId };
        rewards.put(result);
      });
    };
    return () => result;
  });
  if (!result) throw new Error("找不到可開啟的寶箱。");
  return result;
}

async function loadRewardMetrics(db) {
  return runTransaction(db, ["questHistory", "wordProgress", "wordSessions", "storyProgress"], "readonly", (tx) => {
    const quests = tx.objectStore("questHistory").getAll();
    const words = tx.objectStore("wordProgress").getAll();
    const sessions = tx.objectStore("wordSessions").getAll();
    const stories = tx.objectStore("storyProgress").getAll();
    return () => {
      const completedQuests = (quests.result ?? []).filter(({ status }) => status === "completed");
      const masteredWords = (words.result ?? []).filter(({ state }) => state === "mastered");
      const completedStories = (stories.result ?? []).filter(({ completedAt }) => completedAt);
      return { completedQuests, masteredWords, completedStories, wordSessions: sessions.result ?? [] };
    };
  });
}

function backfillCollections(db, system, metrics) {
  const titleIds = eligibleTitleIds(metrics);
  const badgeIds = eligibleBadgeIds(metrics);
  const titleById = new Map(system.titles.map((item) => [item.id, item]));
  const badgeById = new Map(system.badges.map((item) => [item.id, item]));
  return runTransaction(db, ["rewards"], "readwrite", (tx) => {
    const store = tx.objectStore("rewards");
    const now = new Date().toISOString();
    for (const id of titleIds) {
      const item = titleById.get(id);
      if (item) addInventoryIfMissing(store, { id: `inventory:title:${id}`, type: "inventory", category: "title", itemId: id, name: item.name, quantity: 1, unlockedAt: now });
    }
    for (const id of badgeIds) {
      const item = badgeById.get(id);
      if (item) addInventoryIfMissing(store, { id: `inventory:badge:${id}`, type: "inventory", category: "badge", itemId: id, name: item.name, quantity: 1, unlockedAt: now });
    }
  });
}

function addInventoryIfMissing(store, record) {
  const request = store.get(record.id);
  request.onsuccess = () => {
    if (!request.result) store.add(record);
  };
}

export function eligibleTitleIds({ completedQuests, masteredWords, completedStories }) {
  const categoryCount = (category) => completedQuests.filter(({ canonicalCategory }) => canonicalCategory === category).length;
  return [
    completedQuests.length >= 1 && "first_quest",
    completedQuests.length >= 10 && "task_10",
    completedQuests.length >= 50 && "task_50",
    categoryCount("english") >= 10 && "english_10",
    masteredWords.length >= 50 && "english_50",
    completedStories.length >= 10 && "reading_10",
    completedStories.length >= 30 && "reading_30",
    categoryCount("life") >= 10 && "life_10",
    categoryCount("cooperation") >= 10 && "coop_10",
  ].filter(Boolean);
}

export function eligibleBadgeIds({ completedQuests, masteredWords, completedStories }) {
  const completedStoryIds = new Set(completedStories.map(({ storyId }) => storyId));
  const ids = [
    completedQuests.length >= 1 && "badge_first",
    completedQuests.length >= 30 && "badge_30task",
    completedQuests.length >= 100 && "badge_100task",
    masteredWords.length >= 100 && "badge_word100",
  ];
  for (let chapter = 1; chapter <= 6; chapter += 1) {
    const start = (chapter - 1) * 5 + 1;
    if (Array.from({ length: 5 }, (_, index) => `S${String(start + index).padStart(2, "0")}`).every((id) => completedStoryIds.has(id))) ids.push(`badge_story_ch${chapter}`);
  }
  return ids.filter(Boolean);
}

function levelOptionInventory(option, normalizedTicket, now) {
  const at = now.toISOString();
  if (normalizedTicket) return { id: `inventory:ticket:${normalizedTicket.ticketId}`, type: "inventory", category: "ticket", itemId: normalizedTicket.ticketId, name: normalizedTicket.name, quantity: normalizedTicket.quantity, unlockedAt: at };
  const category = option.type === "material_optional" ? "material" : option.type;
  return { id: `inventory:${category}:${option.id}`, type: "inventory", category, itemId: option.id, name: option.name, quantity: 1, unlockedAt: at };
}

function stableSegment(value) {
  return encodeURIComponent(String(value));
}

function mergeInventory(existing, incoming) {
  if (!existing) return incoming;
  if (PERMANENT_INVENTORY_CATEGORIES.has(incoming.category)) return existing;
  return { ...existing, quantity: (existing.quantity ?? 1) + incoming.quantity };
}

function createChestRecord(chestType, sourceId, serial, outcome, now) {
  return { id: `chest:${chestType}:${serial}`, type: "chest", chestType, sourceId, outcome, status: "unopened", createdAt: now.toISOString() };
}

function applyChestOutcome(stores, system, chest, now, done) {
  const outcome = chest.outcome;
  if (outcome.expAmount) {
    const transactionId = `chest-exp:${chest.id}`;
    const transactionRequest = stores.transactions.get(transactionId);
    transactionRequest.onsuccess = () => {
      if (transactionRequest.result) { done(null); return; }
      const playerRequest = stores.players.get(PLAYER_ID);
      playerRequest.onsuccess = () => {
        const player = playerRequest.result;
        if (!player?.progress?.exp) return;
        const current = player.progress.exp.current + outcome.expAmount;
        const derived = deriveLevel(current, system.levelThresholds);
        stores.transactions.add({ id: transactionId, sourceType: "chest", sourceId: chest.id, type: "exp", amount: outcome.expAmount, createdAt: now.toISOString() });
        stores.players.put({ ...player, progress: { ...player.progress, level: derived.level, exp: { ...player.progress.exp, current, target: derived.target } } });
        done(null);
      };
    };
    return;
  }
  const category = outcome.ticketId ? "ticket" : "reward-token";
  const itemId = outcome.ticketId ?? outcome.id;
  const inventoryId = `inventory:${category}:${itemId}`;
  const inventoryRequest = stores.rewards.get(inventoryId);
  inventoryRequest.onsuccess = () => {
    const incoming = { id: inventoryId, type: "inventory", category, itemId, name: outcome.label, quantity: 1, unlockedAt: now.toISOString() };
    stores.rewards.put(mergeInventory(inventoryRequest.result, incoming));
    done(inventoryId);
  };
}

function buildDashboard(system, player, records, pendingClaims, materialRewardsEnabled = false) {
  const inventory = records.filter(({ type }) => type === "inventory");
  const balance = records.find(({ id }) => id === FRAGMENT_BALANCE_ID)?.quantity ?? 0;
  const claimedLevels = new Set(records.filter(({ type }) => type === "level-claim").map(({ level }) => Number(level)));
  const exchangeCatalog = system.levelRewards.map((reward) => ({
    ...reward,
    unlocked: Number(reward.level) <= Number(player?.level ?? 1),
    claimed: claimedLevels.has(Number(reward.level)),
    options: availableLevelOptions(reward, system, materialRewardsEnabled),
  }));
  return {
    player,
    pendingClaims,
    titles: inventory.filter(({ category }) => category === "title"),
    badges: inventory.filter(({ category }) => category === "badge"),
    cosmetics: inventory.filter(({ category }) => category === "cosmetic"),
    tickets: inventory.filter(({ category }) => category === "ticket"),
    privileges: inventory.filter(({ category }) => ["privilege", "material", "reward-token"].includes(category)),
    fragments: { current: balance, needed: system.chestSystem.fragmentsNeeded },
    chests: records.filter(({ type, status }) => type === "chest" && status === "unopened"),
    exchangeCatalog,
    exchangeConditions: {
      titles: system.titles.map(({ id, name, condition }) => ({ id, name, condition, owned: inventory.some(({ category, itemId }) => category === "title" && itemId === id) })),
      badges: system.badges.map(({ id, name, condition }) => ({ id, name, condition, owned: inventory.some(({ category, itemId }) => category === "badge" && itemId === id) })),
    },
  };
}

function getSettingsRecord(db) {
  return runTransaction(db, ["settings"], "readonly", (tx) => {
    const request = tx.objectStore("settings").get(SETTINGS_ID);
    return () => request.result;
  });
}
