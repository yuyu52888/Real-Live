const REWARD_URL = "./03_REWARDS_BOSSES/REWARD_SYSTEM.json";

export const TICKET_ALIASES = Object.freeze({
  reroll_1: { ticketId: "reroll", quantity: 1 },
  reroll_3: { ticketId: "reroll", quantity: 3 },
  quest_skip: { ticketId: "skip", quantity: 1 },
  boss_retry: { ticketId: "boss_retry", quantity: 1 },
  bonus_exp_2: { ticketId: "bonus2", quantity: 1 },
  double_exp: { ticketId: "double", quantity: 1 },
  rest_card: { ticketId: "rest", quantity: 1 },
});

const CHEST_TICKETS = Object.freeze({
  任務重抽券: "reroll",
  普通任務跳過券: "skip",
  Boss復活券: "boss_retry",
  "EXP×2券": "double",
});

export async function loadRewardSystem(url = REWARD_URL, fetcher = fetch) {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`無法讀取獎勵設定（HTTP ${response.status}）`);
  return validateRewardSystem(await response.json());
}

export function validateRewardSystem(system) {
  for (const key of ["levelThresholds", "levelRewards", "chestSystem", "titles", "badges", "tickets", "materialRewardPolicy"]) {
    if (!system?.[key]) throw new Error(`獎勵設定缺少 ${key}`);
  }
  const thresholds = system.levelThresholds;
  if (thresholds.length !== 10 || thresholds.some((item, index) => item.level !== index + 1)) throw new Error("等級門檻必須涵蓋 Lv1–Lv10。");
  if (system.levelRewards.some((reward) => reward.choose !== 1 || reward.options?.length !== 3)) throw new Error("每個升級里程碑必須三選一。");
  if (system.chestSystem.fragmentsNeeded !== 5 || !system.chestSystem.normalChestPool?.length) throw new Error("普通寶箱設定不完整。");
  return system;
}

export function deriveLevel(exp, thresholds) {
  const cumulativeExp = Math.max(0, Number(exp) || 0);
  const ordered = [...thresholds].sort((left, right) => left.level - right.level);
  let current = ordered[0];
  for (const threshold of ordered) {
    if (cumulativeExp < threshold.expRequired) break;
    current = threshold;
  }
  const next = ordered.find(({ level }) => level === current.level + 1);
  return { level: current.level, target: next?.expRequired ?? current.expRequired };
}

export function normalizeTicketOption(option, system) {
  const normalized = TICKET_ALIASES[option.id];
  if (!normalized || !system.tickets.some(({ id }) => id === normalized.ticketId)) return null;
  const ticket = system.tickets.find(({ id }) => id === normalized.ticketId);
  return { ...normalized, name: ticket.name };
}

export function availableLevelOptions(reward, system, materialRewardsEnabled = false) {
  return reward.options.map((option) => ({
    ...option,
    available: option.type === "ticket"
      ? Boolean(normalizeTicketOption(option, system))
      : option.type !== "material_optional" || materialRewardsEnabled,
    deferredReason: option.id === "mystery_unlock" ? "此獎勵將在後續階段開放" : null,
  }));
}

export function selectChestOutcome(system, chestType = "normal", rng = Math.random) {
  const pool = chestType === "normal" ? system.chestSystem.normalChestPool : system.chestSystem.bossChestPool;
  if (!pool?.length) throw new Error(`缺少 ${chestType} 寶箱獎池。`);
  const roll = clampRoll(rng()) * pool.reduce((sum, entry) => sum + entry.weight, 0);
  let accumulated = 0;
  let poolIndex = pool.length - 1;
  for (let index = 0; index < pool.length; index += 1) {
    accumulated += pool[index].weight;
    if (roll < accumulated) { poolIndex = index; break; }
  }
  const entry = pool[poolIndex];
  const itemIndex = Math.min(entry.items.length - 1, Math.floor(clampRoll(rng()) * entry.items.length));
  const label = entry.items[itemIndex];
  const outcome = { id: `chest-outcome:${chestType}:${poolIndex}:${itemIndex}`, type: entry.type, label };
  if (entry.type === "ticket" || entry.type === "ticket_rare") outcome.ticketId = CHEST_TICKETS[label] ?? null;
  if (entry.type === "bonus_exp") outcome.expAmount = Number(label.match(/\d+/)?.[0] ?? 0);
  return outcome;
}

function clampRoll(value) {
  return Math.min(0.999999999, Math.max(0, Number(value) || 0));
}
