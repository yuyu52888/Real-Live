import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { completionInstanceId } from "../js/services/quest-service.js";
import { filterTasks, loadTasks } from "../js/repositories/tasks.js";

const loadJson = async (url) => JSON.parse(await readFile(new URL(`../${url.replace(/^\.\//, "")}`, import.meta.url), "utf8"));
const tasks = await loadTasks({ loadJson });
const manualCases = await loadJson("./incoming/chatgpt/tests/manual-fixtures/STAGE3_MANUAL_QA_CASES.json");
const edgeFixtures = await loadJson("./incoming/chatgpt/tests/manual-fixtures/STAGE3_EDGE_CASE_FIXTURES.json");
const acceptanceMatrix = await loadJson("./incoming/chatgpt/tests/manual-fixtures/STAGE3_ACCEPTANCE_MATRIX.json");

test("A7 contract exposes the reviewed Stage 3 cases without deferred fixtures", () => {
  assert.equal(manualCases.package, "A7");
  assert.equal(manualCases.cases.length, 20);
  assert.deepEqual(edgeFixtures.vectors.map(({ id }) => id), [
    "EDGE-IDEMPOTENCY-001", "EDGE-APPROVAL-001", "EDGE-APPROVAL-002",
    "EDGE-REPEATABLE-001", "EDGE-MULTITAB-001", "EDGE-BOSSNAME-001",
    "EDGE-EXP-001", "EDGE-CATEGORY-001", "EDGE-PHOTO-001",
  ]);
  assert.ok(acceptanceMatrix.requirements.every(({ cases }) => cases.every((id) => /^S3-QA-\d{3}$/.test(id))));
});

test("S3-QA-001 repository loads 120 general + 30 exercise + 30 chore with unique IDs", () => {
  assert.equal(tasks.filter(({ taskFamily }) => taskFamily === "general").length, 120);
  assert.equal(tasks.filter(({ taskFamily }) => taskFamily === "exercise").length, 30);
  assert.equal(tasks.filter(({ taskFamily }) => taskFamily === "chore").length, 30);
  assert.equal(tasks.length, 180);
  assert.equal(new Set(tasks.map(({ id }) => id)).size, 180);
});

test("S3-QA-002 / EDGE-CATEGORY-001 aliases never mutate canonical categories", () => {
  const before = new Map(tasks.map(({ id, category }) => [id, category]));
  assert.equal(filterTasks(tasks, "all").length, 180);
  assert.equal(filterTasks(tasks, "exercise").length, 40);
  assert.equal(filterTasks(tasks, "chores").length, 30);
  assert.ok(filterTasks(tasks, "exercise").some(({ category }) => category === "exercise_home"));
  for (const task of tasks) assert.equal(task.category, before.get(task.id));
});

test("S3-QA-012/013 repeatable identity is stable per instance and changes for a new eligible day", () => {
  const task = tasks.find(({ id }) => id === "T001");
  const first = new Date(2026, 8, 20, 8, 0, 0);
  const sameDay = new Date(2026, 8, 20, 21, 0, 0);
  const nextDay = new Date(2026, 8, 21, 8, 0, 0);
  assert.equal(completionInstanceId(task, first), completionInstanceId(task, sameDay));
  assert.notEqual(completionInstanceId(task, first), completionInstanceId(task, nextDay));
});

test("S3-QA-014 Txxx Boss-named tasks stay ordinary repository records", () => {
  const bossNamed = tasks.filter((task) => task.id.startsWith("T") && task.name.includes("Boss"));
  assert.ok(bossNamed.length > 0);
  assert.ok(bossNamed.every(({ taskFamily, id }) => taskFamily === "general" && /^T\d{3}$/.test(id)));
});

test("S3-QA-015 repository does not invent hidden quests", () => {
  assert.deepEqual(filterTasks(tasks, "hidden"), []);
  assert.ok(tasks.every(({ category }) => category !== "hidden"));
});

test("S3-QA-020 exercise/chore safety, off-screen, tips, and approval flags survive loading", () => {
  for (const family of ["exercise", "chore"]) {
    const familyTasks = tasks.filter(({ taskFamily }) => taskFamily === family);
    assert.equal(familyTasks.length, 30);
    assert.ok(familyTasks.every((task) => (
      task.screenMode === "offscreen" && task.requiresParentConfirmation === true &&
      task.movementTipsZh.length === 3 && Boolean(task.safetyNote)
    )));
  }
});
