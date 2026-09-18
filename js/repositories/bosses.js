const BOSS_URL = "./03_REWARDS_BOSSES/BOSSES_6.json";

export async function loadBosses(url = BOSS_URL, fetcher = fetch) {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`無法讀取 Boss 資料（HTTP ${response.status}）`);
  return validateBosses(await response.json());
}

export function validateBosses(bosses) {
  if (!Array.isArray(bosses) || bosses.length !== 6) throw new Error("Boss 資料必須正好包含 B01～B06。");
  const ids = new Set();
  const chapters = new Set();
  for (const boss of bosses) {
    if (!/^B0[1-6]$/.test(boss?.id) || ids.has(boss.id)) throw new Error("Boss ID 必須是唯一的 B01～B06。");
    if (!Number.isInteger(boss.chapter) || boss.chapter < 1 || boss.chapter > 6 || chapters.has(boss.chapter)) throw new Error("Boss 章節必須是唯一的 1～6。");
    if (!boss.name || !boss.chapterName || !boss.story || !boss.challenge || !boss.rewards) throw new Error(`${boss.id} 缺少必要內容。`);
    if (!Number.isInteger(boss.hp) || boss.hp <= 0 || boss.progress?.length !== boss.hp) throw new Error(`${boss.id} 的 HP 必須等於進度步驟數。`);
    if (boss.progress.some((entry, index) => entry.step !== index + 1 || !entry.desc)) throw new Error(`${boss.id} 的進度步驟必須從 1 連續排列。`);
    if (!Number.isFinite(Number(boss.rewards.exp)) || Number(boss.rewards.exp) < 0) throw new Error(`${boss.id} 的 EXP 獎勵無效。`);
    if (!boss.rewards.badge || boss.rewards.chest !== "chapter" || !boss.rewards.cosmetic) throw new Error(`${boss.id} 的勝利獎勵不完整。`);
    ids.add(boss.id);
    chapters.add(boss.chapter);
  }
  const orderedIds = [...bosses].sort((a, b) => a.chapter - b.chapter).map(({ id }) => id);
  if (orderedIds.some((id, index) => id !== `B0${index + 1}`)) throw new Error("Boss ID 與章節對應不正確。");
  return bosses;
}

export function getBossById(bosses, bossId) {
  return bosses.find(({ id }) => id === bossId);
}
