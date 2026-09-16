import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { filterTasks, getTaskActivityControl, loadTasks } from "../js/repositories/tasks.js";
import { renderQuests } from "../js/pages/quests.js";

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
