import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { APP_ROUTES } from "../js/core/router.js";
import { renderParentApprovals } from "../js/pages/parent-approvals.js";
import { isRestDay, normalizeParentPreferences, taskAllowedBySettings } from "../js/services/parent-settings.js";
import { buildWeeklyReport, localWeekRange } from "../js/services/weekly-report.js";

test("Stage 8 validates parent preferences and applies only reusable task filters", () => {
  const preferences = normalizeParentPreferences({
    dailyTaskGoal: 3, maxTaskDifficulty: 2, exerciseEnabled: false, choresEnabled: true,
    parentApprovalRequired: false, restDays: [0, 6, 0], speechMinRate: 0.7, speechMaxRate: 0.9,
    materialRewardsEnabled: true,
  }, { speechRate: 1 });
  assert.deepEqual(preferences.restDays, [0, 6]);
  assert.equal(preferences.speechRate, 0.9);
  assert.equal(taskAllowedBySettings({ taskFamily: "exercise", difficulty: "★" }, preferences), false);
  assert.equal(taskAllowedBySettings({ taskFamily: "general", difficulty: "★★★" }, preferences), false);
  assert.equal(taskAllowedBySettings({ taskFamily: "chore", difficulty: "★★" }, preferences), true);
  assert.equal(isRestDay(preferences, new Date(2026, 8, 20)), true);
  assert.throws(() => normalizeParentPreferences({ dailyTaskGoal: 4 }), /1～3/);
  assert.throws(() => normalizeParentPreferences({ speechMinRate: 0.95, speechMaxRate: 0.9 }), /最低語速/);
});

test("Stage 8 weekly report uses Monday-local boundaries and structured records only", () => {
  const now = new Date(2026, 8, 18, 12);
  const { start, end } = localWeekRange(now);
  assert.equal(start.getDay(), 1);
  assert.equal(end.getTime() - start.getTime(), 7 * 24 * 60 * 60 * 1000);
  const report = buildWeeklyReport({
    now,
    tasks: [
      { id: "T001", ability: "focus", abilityZh: "專注力", abilityExp: 2 },
      { id: "T002", ability: "learning", abilityZh: "學習力", abilityExp: 2 },
      { id: "EX001", ability: "persistence", abilityZh: "耐心力", abilityExp: 1 },
    ],
    histories: [
      { questId: "T001", status: "completed", completedAt: "2026-09-15T02:00:00.000Z", taskFamily: "general", durationMinutes: 8 },
      { questId: "T002", status: "completed", completedAt: "2026-09-17T02:00:00.000Z", taskFamily: "general" },
      { questId: "EX001", status: "completed", completedAt: "2026-09-16T02:00:00.000Z", taskFamily: "exercise" },
      { questId: "T001", status: "completed", completedAt: "2026-09-13T02:00:00.000Z", taskFamily: "general" },
    ],
    approvals: [{ returnEvents: ["2026-09-17T02:00:00.000Z", "2026-09-12T02:00:00.000Z"] }],
    sessions: [{ completedAt: "2026-09-17T02:00:00.000Z", results: [{}, {}], durationMinutes: 4 }],
    stories: [{ completedAt: "2026-09-18T02:00:00.000Z" }],
  });
  assert.equal(report.completedQuests, 3);
  assert.equal(report.exercise, 1);
  assert.equal(report.englishSessions, 1);
  assert.equal(report.answeredCards, 2);
  assert.equal(report.stories, 1);
  assert.equal(report.retries, 1);
  assert.equal(report.focusMinutes, 12);
  assert.deepEqual(report.strongestAbility.ids, ["focus", "learning"]);
  assert.equal(report.strongestAbility.label, "專注力、學習力");

  const persistenceReport = buildWeeklyReport({
    now,
    tasks: [{ id: "T003", ability: "persistence", abilityZh: "耐心力", abilityExp: 2 }],
    histories: [{
      questId: "T003", status: "completed", completedAt: "2026-09-18T02:00:00.000Z", taskFamily: "general",
    }],
  });
  assert.equal(persistenceReport.strongestAbility.label, "耐心力");
});

test("Stage 8 Parent page exposes three tabs while bottom navigation remains five items", () => {
  const html = renderParentApprovals({
    onboarding: { avatarVariant: "boy", settings: {} },
    questUi: { parentUnlocked: true, approvals: [], tasks: [] },
    parentUi: { activeTab: "approvals", settings: {}, packs: [], report: null },
  });
  assert.match(html, /data-parent-tab="approvals"/);
  assert.match(html, /data-parent-tab="report"/);
  assert.match(html, /data-parent-tab="settings"/);
  assert.deepEqual(APP_ROUTES.map(({ id }) => id), ["home", "quests", "learn", "hero", "parent"]);
});

test("Stage 8 keeps the IndexedDB version and canonical content untouched", async () => {
  const schema = await readFile(new URL("../js/core/db-schema.js", import.meta.url), "utf8");
  assert.match(schema, /DB_VERSION = 2/);
  const page = await readFile(new URL("../js/pages/parent-sections.js", import.meta.url), "utf8");
  assert.doesNotMatch(page, /T\d{3}|EX\d{3}|CH\d{3}|B0[1-6]|S\d{2}/);
});
