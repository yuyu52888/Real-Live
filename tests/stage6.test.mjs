import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderHero } from "../js/pages/hero.js";
import { renderHome } from "../js/pages/home.js";
import { eligibleBadgeIds, eligibleTitleIds, fragmentConversion } from "../js/services/reward-service.js";
import { availableLevelOptions, deriveLevel, normalizeTicketOption, selectChestOutcome, validateRewardSystem } from "../js/services/reward-system.js";

const system = validateRewardSystem(JSON.parse(await readFile(new URL("../03_REWARDS_BOSSES/REWARD_SYSTEM.json", import.meta.url), "utf8")));

test("Stage 6 loads the canonical reward catalogs and thresholds", () => {
  assert.deepEqual(system.levelThresholds.map(({ expRequired }) => expRequired), [0, 30, 65, 105, 150, 200, 255, 315, 380, 450]);
  assert.equal(system.levelRewards.length, 9);
  assert.ok(system.titles.length > 0 && system.badges.length > 0 && system.tickets.length === 6);
  assert.equal(system.chestSystem.fragmentsNeeded, 5);
});

test("Stage 6 derives cumulative level and next threshold boundaries", () => {
  const expected = [[0, 1, 30], [29, 1, 30], [30, 2, 65], [64, 2, 65], [65, 3, 105], [104, 3, 105], [105, 4, 150], [449, 9, 450], [450, 10, 450], [451, 10, 450]];
  for (const [exp, level, target] of expected) assert.deepEqual(deriveLevel(exp, system.levelThresholds), { level, target });
});

test("Stage 6 normalizes ticket aliases exactly and defers mystery_unlock", () => {
  const expected = {
    reroll_1: ["reroll", 1], reroll_3: ["reroll", 3], quest_skip: ["skip", 1], boss_retry: ["boss_retry", 1],
    bonus_exp_2: ["bonus2", 1], double_exp: ["double", 1], rest_card: ["rest", 1],
  };
  for (const reward of system.levelRewards) for (const option of reward.options.filter(({ type }) => type === "ticket")) {
    const normalized = normalizeTicketOption(option, system);
    if (option.id === "mystery_unlock") assert.equal(normalized, null);
    else assert.deepEqual([normalized.ticketId, normalized.quantity], expected[option.id]);
  }
  const level7 = availableLevelOptions(system.levelRewards.find(({ level }) => level === 7), system);
  assert.equal(level7.find(({ id }) => id === "mystery_unlock").available, false);
});

test("Stage 6 keeps material rewards disabled unless explicitly enabled", () => {
  const level10 = system.levelRewards.find(({ level }) => level === 10);
  assert.equal(availableLevelOptions(level10, system).find(({ id }) => id === "small_gift").available, false);
  assert.equal(availableLevelOptions(level10, system, true).find(({ id }) => id === "small_gift").available, true);
});

test("Stage 6 fragment conversion preserves remainder and creates exact chests", () => {
  assert.deepEqual(fragmentConversion(0, 4), { chestCount: 0, remainder: 4 });
  assert.deepEqual(fragmentConversion(0, 5), { chestCount: 1, remainder: 0 });
  assert.deepEqual(fragmentConversion(0, 7), { chestCount: 1, remainder: 2 });
  assert.deepEqual(fragmentConversion(0, 10), { chestCount: 2, remainder: 0 });
});

test("Stage 6 evaluators unlock only supported stable title and badge IDs", () => {
  const completedQuests = Array.from({ length: 100 }, (_, index) => ({ status: "completed", canonicalCategory: index < 10 ? "english" : index < 20 ? "life" : index < 30 ? "cooperation" : "general" }));
  const masteredWords = Array.from({ length: 100 }, () => ({ state: "mastered" }));
  const completedStories = Array.from({ length: 30 }, (_, index) => ({ storyId: `S${String(index + 1).padStart(2, "0")}`, completedAt: "2026-09-17T00:00:00.000Z" }));
  const titles = eligibleTitleIds({ completedQuests, masteredWords, completedStories });
  const badges = eligibleBadgeIds({ completedQuests, masteredWords, completedStories });
  for (const deferred of ["retry_5", "retry_20", "focus_100", "boss_5", "streak_7", "self_start_10"]) assert.ok(!titles.includes(deferred));
  for (const deferred of ["badge_first_boss", "badge_7day"]) assert.ok(!badges.includes(deferred));
  assert.ok(titles.includes("reading_30") && titles.includes("english_50") && titles.includes("coop_10"));
  assert.ok(badges.includes("badge_100task") && badges.includes("badge_word100") && badges.includes("badge_story_ch6"));
});

test("Stage 6 chest RNG creates a stable internal outcome rather than a localized key", () => {
  const rolls = [0.81, 0];
  const outcome = selectChestOutcome(system, "normal", () => rolls.shift());
  assert.equal(outcome.id, "chest-outcome:normal:4:0");
  assert.equal(outcome.expAmount, 2);
  assert.equal(outcome.label, "+2 EXP");
});

test("Stage 6 Hero and Home render real reward state", () => {
  const state = {
    onboarding: { nickname: "小晴", avatarVariant: "girl", settings: { dailyTaskGoal: 2, exerciseEnabled: true, choresEnabled: true } },
    player: { level: 2, title: "初學冒險者", exp: { current: 30, target: 65 }, activeTitleId: "first_quest" },
    rewardUi: { player: { level: 2, title: "初學冒險者", exp: { current: 30, target: 65 }, activeTitleId: "first_quest" }, pendingClaims: [], titles: [], badges: [], cosmetics: [], tickets: [], privileges: [], fragments: { current: 3, needed: 5 }, chests: [] },
    questUi: { tasks: [], history: [] },
  };
  const hero = renderHero(state);
  const home = renderHome(state);
  assert.match(hero, /Lv\.2/);
  assert.match(hero, /30 \/ 65/);
  assert.match(hero, /3 \/ 5/);
  assert.match(hero, /外觀只讓角色/);
  assert.match(home, /3 \/ 5/);
});

test("Stage 6 preserves cumulative Lv10 EXP text while clamping progressbar ARIA", () => {
  const player = { level: 10, title: "傳奇冒險者", exp: { current: 451, target: 450 } };
  const state = {
    onboarding: { nickname: "小晴", avatarVariant: "girl", settings: { dailyTaskGoal: 2, exerciseEnabled: true, choresEnabled: true } },
    player,
    rewardUi: { player, pendingClaims: [], titles: [], badges: [], cosmetics: [], tickets: [], privileges: [], fragments: { current: 0, needed: 5 }, chests: [] },
    questUi: { tasks: [], history: [] },
  };
  for (const html of [renderHome(state), renderHero(state)]) {
    assert.match(html, /451 \/ 450/);
    assert.match(html, /aria-valuemax="450" aria-valuenow="450"/);
  }
});

test("Stage 6 synchronizes rewards only for quest completion and approval", async () => {
  const source = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(source, /requestQuestCompletion\(database, task\), taskId, \{ syncRewards: true \}/);
  assert.match(source, /approveQuestCompletion\(database, completionId\), undefined, \{ syncRewards: true \}/);
  assert.match(source, /async function performQuest\(operation, taskId, \{ syncRewards = false \} = \{\}\)/);
  assert.match(source, /if \(syncRewards\) await refreshRewardState\(\)/);
  assert.doesNotMatch(source, /startQuest\(database, task\), taskId, \{ syncRewards: true \}/);
  assert.doesNotMatch(source, /updateQuestProgress[\s\S]{0,160}syncRewards: true/);
});

test("Stage 6 runtime does not add Boss progress or infer ordinary quest fragments", async () => {
  const source = await Promise.all(["js/services/reward-service.js", "js/app.js"].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
  assert.doesNotMatch(source.join("\n"), /bossProgress/);
  assert.doesNotMatch(source.join("\n"), /difficulty.*fragment|quest.*grantChestFragments/i);
});
