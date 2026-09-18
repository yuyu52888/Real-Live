import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { filterTasks, getTaskActivityControl, loadTasks } from "../js/repositories/tasks.js";
import { renderQuests } from "../js/pages/quests.js";
import { completionInstanceId, countDailyQuestSlots, dailyQuestLimitReached } from "../js/services/quest-service.js";

const loadJson = async (url) => JSON.parse(await readFile(new URL(`../${url.replace(/^\.\//, "")}`, import.meta.url), "utf8"));
const tasks = await loadTasks({ loadJson });

test("task repository loads 120 + 30 + 30 canonical tasks with unique stable IDs", () => {
  assert.equal(tasks.filter(({ taskFamily }) => taskFamily === "general").length, 120);
  assert.equal(tasks.filter(({ taskFamily }) => taskFamily === "exercise").length, 30);
  assert.equal(tasks.filter(({ taskFamily }) => taskFamily === "chore").length, 30);
  assert.equal(tasks.length, 180);
  assert.equal(new Set(tasks.map(({ id }) => id)).size, 180);
});

test("category aliases filter without mutating canonical category IDs", () => {
  const categories = new Map(tasks.map((task) => [task.id, task.category]));
  assert.equal(filterTasks(tasks, "exercise").length, 40);
  assert.equal(filterTasks(tasks, "chores").length, 30);
  assert.equal(filterTasks(tasks, "hidden").length, 0);
  for (const task of tasks) assert.equal(task.category, categories.get(task.id));
});

test("exercise and chore detail expose canonical tips and safety", () => {
  for (const [taskId, family] of [["EX001", "exercise"], ["CH001", "chore"]]) {
    const task = tasks.find(({ id }) => id === taskId);
    const html = renderQuests({
      onboarding: { avatarVariant: "boy", settings: { exerciseEnabled: true, choresEnabled: true } },
      questUi: { tasks, history: [], approvals: [], filter: family === "chore" ? "chores" : "exercise", selectedTaskId: taskId, activeTimerTaskId: null },
    });
    assert.equal(task.movementTipsZh.length, 3);
    assert.ok(task.safetyNote);
    for (const tip of task.movementTipsZh) assert.match(html, new RegExp(escapeRegExp(tip)));
    assert.match(html, new RegExp(escapeRegExp(task.safetyNote)));
  }
});

test("exercise controls are derived only from canonical completion criteria", () => {
  assert.deepEqual(getTaskActivityControl(tasks.find(({ id }) => id === "EX001")), { type: "counter", target: 100, unit: "下" });
  assert.equal(getTaskActivityControl(tasks.find(({ id }) => id === "CH001")), null);
  assert.equal(getTaskActivityControl(tasks.find(({ id }) => id === "T001")), null);
});

test("Txxx Boss-named records remain ordinary general quests", () => {
  const bossNamed = tasks.filter((task) => task.id.startsWith("T") && task.name.includes("Boss"));
  assert.ok(bossNamed.length > 0);
  assert.ok(bossNamed.every((task) => task.taskFamily === "general" && !task.assetLogicalId));
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


test("daily quest quota resets by local date and blocks repeats before reset", () => {
  const task = tasks.find(({ repeatable }) => repeatable);
  const today = new Date(2026, 8, 18, 10, 0, 0);
  const tomorrow = new Date(2026, 8, 19, 10, 0, 0);
  assert.notEqual(completionInstanceId(task, today), completionInstanceId(task, tomorrow));

  const history = [
    { id: "a", dateKey: "2026-09-18", status: "completed" },
    { id: "b", dateKey: "2026-09-18", status: "pending_approval" },
    { id: "c", dateKey: "2026-09-18", status: "returned" },
    { id: "d", dateKey: "2026-09-18", status: "in_progress" },
    { id: "e", dateKey: "2026-09-17", status: "completed" },
  ];
  assert.equal(countDailyQuestSlots(history, today), 3);
  assert.equal(dailyQuestLimitReached(history, 3, today), true);
  assert.equal(dailyQuestLimitReached(history, 3, tomorrow), false);
});


test("quest page disables new starts when today's hard limit is full", () => {
  const today = new Date();
  const dateKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const html = renderQuests({
    onboarding: {
      avatarVariant: "boy",
      settings: { dailyTaskGoal: 1, maxTaskDifficulty: 5, exerciseEnabled: true, choresEnabled: true, parentApprovalRequired: false },
    },
    questUi: {
      tasks,
      history: [{ id: "quota-used", questId: "fixture", dateKey, status: "completed" }],
      approvals: [],
      filter: "all",
      selectedTaskId: null,
      activeTimerTaskId: null,
    },
  });
  assert.match(html, /1 \/ 1/);
  assert.match(html, /今日已達上限|今日任務額度已用完/);
  assert.doesNotMatch(html, /data-start-quest=/);
});
