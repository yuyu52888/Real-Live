export const TASK_SOURCES = Object.freeze([
  Object.freeze({ family: "general", url: "./02_DATA/reality_tasks_120.json" }),
  Object.freeze({ family: "exercise", url: "./02_DATA/exercise_task_cards_30.json" }),
  Object.freeze({ family: "chore", url: "./02_DATA/chore_task_cards_30.json" }),
]);

export const TASK_FILTER_ALIASES = Object.freeze({
  all: Object.freeze(["*"]),
  reading: Object.freeze(["reading_story"]),
  english: Object.freeze(["english"]),
  exercise: Object.freeze(["exercise", "exercise_home"]),
  chores: Object.freeze(["chores_home"]),
  life: Object.freeze(["life"]),
  hidden: Object.freeze([]),
});

export async function loadTasks({ loadJson = fetchJson, sources = TASK_SOURCES } = {}) {
  const groups = await Promise.all(sources.map(async ({ family, url }) => {
    const records = await loadJson(url);
    if (!Array.isArray(records)) throw new Error(`任務資料格式錯誤：${url}`);
    return records.map((record) => normalizeTask(record, family));
  }));
  const tasks = groups.flat();
  const ids = new Set(tasks.map(({ id }) => id));
  if (ids.size !== tasks.length) throw new Error("任務 ID 必須保持唯一。");
  return Object.freeze(tasks);
}

export function filterTasks(tasks, filterId) {
  const categories = TASK_FILTER_ALIASES[filterId];
  if (!categories) throw new Error(`未知任務分類：${filterId}`);
  if (categories.includes("*")) return [...tasks];
  return tasks.filter((task) => categories.includes(task.category));
}

export function getTaskById(tasks, taskId) {
  return tasks.find((task) => task.id === taskId) ?? null;
}

export function getTaskActivityControl(task) {
  if (task.taskFamily !== "exercise") return null;
  const criteria = task.completionCriteria;
  const seconds = criteria.match(/(\d+)\s*秒/);
  if (seconds) return Object.freeze({ type: "timer", target: Number(seconds[1]), unit: "秒" });
  const minutes = criteria.match(/(\d+)\s*分(?:鐘)?/);
  if (minutes) return Object.freeze({ type: "timer", target: Number(minutes[1]) * 60, unit: "秒" });
  const count = criteria.match(/(\d+)\s*(下|次|趟|組|輪)/);
  if (count) return Object.freeze({ type: "counter", target: Number(count[1]), unit: count[2] });
  return null;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法載入任務資料：${url}`);
  return response.json();
}

function normalizeTask(record, family) {
  if (!record || typeof record.id !== "string" || typeof record.category !== "string") {
    throw new Error("任務缺少穩定 ID 或分類。");
  }
  const task = structuredClone(record);
  task.taskFamily = family;
  task.assetLogicalId = family === "exercise"
    ? `task.exercise.${task.id}`
    : family === "chore" ? `task.chore.${task.id}` : null;
  if (Array.isArray(task.movementTipsZh)) Object.freeze(task.movementTipsZh);
  if (task.imageDisplay) Object.freeze(task.imageDisplay);
  return Object.freeze(task);
}
