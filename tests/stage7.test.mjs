import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { APP_ROUTES } from "../js/core/router.js";
import { renderBossPage, renderHomeBossCard } from "../js/pages/boss.js";
import { validateBosses } from "../js/repositories/bosses.js";
import { createAssetResolver } from "../js/services/asset-registry.js";
import { bossUnlockProgress, buildBossDashboard, selectHomeBoss, storyIdsForBoss } from "../js/services/boss-service.js";

const readJson = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const bosses = validateBosses(await readJson("03_REWARDS_BOSSES/BOSSES_6.json"));

test("Stage 7 validates exactly six canonical Bosses and contiguous HP steps", () => {
  assert.deepEqual(bosses.map(({ id, chapter, hp }) => [id, chapter, hp]), [
    ["B01", 1, 3], ["B02", 2, 3], ["B03", 3, 3], ["B04", 4, 5], ["B05", 5, 4], ["B06", 6, 3],
  ]);
  for (const boss of bosses) {
    assert.equal(boss.progress.length, boss.hp);
    assert.deepEqual(boss.progress.map(({ step }) => step), Array.from({ length: boss.hp }, (_, index) => index + 1));
  }
});

test("Stage 7 derives unlock from each stable five-story chapter boundary", () => {
  for (const boss of bosses) {
    const ids = storyIdsForBoss(boss);
    assert.equal(ids.length, 5);
    assert.equal(bossUnlockProgress(boss, ids.slice(0, 4).map((storyId) => ({ storyId, completedAt: "now" }))).unlocked, false);
    assert.deepEqual(bossUnlockProgress(boss, ids.map((storyId) => ({ storyId, completedAt: "now" }))), { completed: 5, total: 5, unlocked: true });
  }
});

test("Stage 7 dashboard keeps all six Bosses and chooses the first actionable Boss", () => {
  const stories = storyIdsForBoss(bosses[0]).map((storyId) => ({ storyId, completedAt: "now" }));
  let dashboard = buildBossDashboard(bosses, stories, [], []);
  assert.equal(dashboard.bosses.length, 6);
  assert.equal(dashboard.homeBoss.id, "B01");
  assert.equal(dashboard.homeBoss.unlock.unlocked, true);
  dashboard = buildBossDashboard(bosses, stories, [{ bossId: "B01", completedSteps: [1, 2, 3], defeatedAt: "now", rewardsGrantedAt: "now" }], []);
  assert.equal(dashboard.homeBoss.id, "B02");
  assert.equal(dashboard.homeBoss.unlock.unlocked, false);
  assert.equal(selectHomeBoss(dashboard.bosses).id, "B02");
  const allStories = bosses.flatMap((boss) => storyIdsForBoss(boss)).map((storyId) => ({ storyId, completedAt: "now" }));
  const allProgress = bosses.map((boss) => ({ bossId: boss.id, completedSteps: boss.progress.map(({ step }) => step), defeatedAt: "now", rewardsGrantedAt: "now" }));
  dashboard = buildBossDashboard(bosses, allStories, allProgress, []);
  assert.equal(dashboard.allDefeated, true);
  assert.equal(dashboard.homeBoss.allDefeated, true);
  assert.match(renderHomeBossCard(dashboard.homeBoss), /六章 Boss 全部完成/);
  assert.deepEqual(APP_ROUTES.map(({ id }) => id), ["home", "quests", "learn", "hero", "parent"]);

});

test("Stage 7 resolves every production Boss through the A6 AssetRegistry contract", async () => {
  const resolver = createAssetResolver(await readJson("assets/ASSET_MANIFEST.json"));
  for (const boss of bosses) {
    const result = resolver.resolve(`boss.${boss.id}`);
    assert.equal(result.type, "path");
    assert.match(result.value, new RegExp(`boss_${boss.id.toLowerCase()}_`));
    const cosmetic = resolver.resolve(`cosmetic.boss_${boss.id.toLowerCase()}`);
    assert.equal(cosmetic.type, "path");
    assert.match(cosmetic.value, new RegExp(`cosmetic_boss_${boss.id.toLowerCase()}\\.png$`));
  }
});

test("Stage 7 Home and detail UI expose lock, HP, ordered steps, rewards, and five-item navigation", () => {
  const stories = storyIdsForBoss(bosses[0]).map((storyId) => ({ storyId, completedAt: "now" }));
  const dashboard = buildBossDashboard(bosses, stories, [{ bossId: "B01", completedSteps: [1] }], []);
  const state = { bossUi: { ...dashboard, selectedBossId: "B01" } };
  const home = renderHomeBossCard(dashboard.homeBoss);
  const detail = renderBossPage(state);
  assert.match(home, /HP 2 \/ 3/);
  assert.match(detail, /boss\.B01|boss_b01|貪吃錢袋怪/);
  assert.match(detail, /data-complete-boss-step="2"/);
  assert.equal((detail.match(/data-open-boss=/g) ?? []).length, 6);
  assert.match(detail, /5 寶箱碎片 \+ 章節寶箱/);
});

test("Stage 7 treats challenge prose as display-only and never infers approval", async () => {
  const source = await readFile(new URL("../js/services/boss-service.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setInterval|setTimeout|approval|parentPin|verifyParent/i);
  assert.doesNotMatch(source, /challenge\.(?:match|includes)|parse.*challenge/i);
});


test("Stage 7 does not change DB_VERSION or embed canonical Boss content in runtime HTML", async () => {
  const schema = await readFile(new URL("../js/core/db-schema.js", import.meta.url), "utf8");
  const home = await readFile(new URL("../js/pages/home.js", import.meta.url), "utf8");
  assert.match(schema, /DB_VERSION = 2/);
  assert.doesNotMatch(home, /貪吃錢袋怪|現在就要巨人|誤會迷霧龍/);
  assert.doesNotMatch(home, /挑戰尚未開放|Stage 7 接入/);
  assert.equal((await readFile(new URL("../03_REWARDS_BOSSES/BOSSES_6.json", import.meta.url), "utf8")).includes("貪吃錢袋怪"), true);
});
