import { runTransaction } from "../core/database.js";
import { PLAYER_ID } from "../repositories/player.js";
import { getSettings, saveSettings } from "../repositories/settings.js";
import { normalizeSpeechRate, SPEECH_DEFAULTS } from "./speech.js";

export const PARENT_SETTING_DEFAULTS = Object.freeze({
  dailyTaskGoal: 2,
  exerciseEnabled: true,
  choresEnabled: true,
  parentApprovalRequired: true,
  maxTaskDifficulty: 5,
  restDays: Object.freeze([]),
  speechMinRate: SPEECH_DEFAULTS.min,
  speechMaxRate: SPEECH_DEFAULTS.max,
  materialRewardsEnabled: false,
});

export function normalizeParentPreferences(input = {}, current = {}) {
  const dailyTaskGoal = integerInRange(input.dailyTaskGoal ?? current.dailyTaskGoal ?? 2, 1, 3, "每日任務目標");
  const maxTaskDifficulty = integerInRange(input.maxTaskDifficulty ?? current.maxTaskDifficulty ?? 5, 1, 5, "任務難度");
  const speechMinRate = normalizeSpeechRate(input.speechMinRate ?? current.speechMinRate ?? SPEECH_DEFAULTS.min);
  const speechMaxRate = normalizeSpeechRate(input.speechMaxRate ?? current.speechMaxRate ?? SPEECH_DEFAULTS.max);
  if (speechMinRate > speechMaxRate) throw new RangeError("最低語速不可高於最高語速。");
  const restDays = [...new Set((input.restDays ?? current.restDays ?? []).map(Number))].sort((a, b) => a - b);
  if (restDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new RangeError("休息日必須是星期日到星期六。");
  const oldRate = normalizeSpeechRate(current.speechRate ?? SPEECH_DEFAULTS.rate);
  const speechRate = Math.min(speechMaxRate, Math.max(speechMinRate, oldRate));
  return {
    ...current,
    dailyTaskGoal,
    exerciseEnabled: booleanValue(input, "exerciseEnabled", current.exerciseEnabled ?? true),
    choresEnabled: booleanValue(input, "choresEnabled", current.choresEnabled ?? true),
    parentApprovalRequired: booleanValue(input, "parentApprovalRequired", current.parentApprovalRequired ?? true),
    maxTaskDifficulty,
    restDays,
    speechMinRate,
    speechMaxRate,
    speechRate,
    materialRewardsEnabled: booleanValue(input, "materialRewardsEnabled", current.materialRewardsEnabled ?? false),
  };
}

export async function saveParentPreferences(db, input) {
  const settings = await getSettings(db);
  const preferences = normalizeParentPreferences(input, settings?.preferences);
  await saveSettings(db, { ...settings, preferences });
  return preferences;
}

export function switchPlayerAvatar(db, avatarVariant) {
  if (!["boy", "girl"].includes(avatarVariant)) return Promise.reject(new Error("角色只能選擇男主角或女主角。"));
  return runTransaction(db, ["player"], "readwrite", (tx) => {
    const store = tx.objectStore("player");
    const request = store.get(PLAYER_ID);
    let result;
    request.onsuccess = () => {
      if (!request.result) return;
      result = { ...request.result, avatarVariant };
      store.put(result);
    };
    return () => result;
  }).then((result) => {
    if (!result) throw new Error("找不到玩家資料。");
    return result;
  });
}

export function taskDifficulty(task) {
  return Math.max(1, Math.min(5, [...String(task?.difficulty ?? "")].filter((symbol) => symbol === "★").length || 1));
}

export function taskAllowedBySettings(task, settings) {
  if (task.taskFamily === "exercise" && settings.exerciseEnabled === false) return false;
  if (task.taskFamily === "chore" && settings.choresEnabled === false) return false;
  return taskDifficulty(task) <= (settings.maxTaskDifficulty ?? 5);
}

export function isRestDay(settings, date = new Date()) {
  return (settings.restDays ?? []).includes(date.getDay());
}

function integerInRange(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new RangeError(`${label}必須介於 ${min}～${max}。`);
  return number;
}

function booleanValue(input, key, fallback) {
  return Object.hasOwn(input, key) ? Boolean(input[key]) : Boolean(fallback);
}
